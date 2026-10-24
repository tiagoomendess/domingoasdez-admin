#!/usr/bin/env bash
# Production deploy: pull master, install, build, back up + migrate the database when there are
# pending migrations, then reload PM2 (the admin and the jobs worker) and check /healthz and the
# worker heartbeat. Run it on the server from the repository, as the user that owns the PM2 process:
#
#   scripts/deploy.sh                deploy the latest master
#   scripts/deploy.sh --force        redeploy even when master has nothing new (e.g. after a failure)
#   scripts/deploy.sh --skip-backup  don't dump the database before migrating
#   scripts/deploy.sh --rollback     serve the previous build again (code and database stay as they are)
#
# The new build goes to build.next while the old one keeps serving, and is swapped in right before
# the reload; the previous build is kept as build.prev for --rollback. Migrations follow the
# expand/contract rules (docs/architecture.md), so the previous build still works after them.
# Database dumps go to $DEPLOY_BACKUP_DIR (default ./backups), newest 5 kept.

set -Eeuo pipefail

APP=domingoasdez-admin
WORKER=domingoasdez-admin-worker
BRANCH=master

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/deploy.sh"

ARGS=("$@")
FORCE=0
SKIP_BACKUP=0
ROLLBACK=0
SWAPPED=0
STEP='starting'

step() {
	STEP="$1"
	printf '\n\033[1;34m==> %s\033[0m\n' "$1"
}

fail() {
	printf '\n\033[1;31mDeploy failed: %s\033[0m\n' "$1" >&2
	exit 1
}

on_error() {
	# set -E also runs the trap in failing $(...) subshells: report once, from the script itself.
	[[ $BASHPID == "$$" ]] || return 0
	printf '\n\033[1;31mDeploy failed at: %s\033[0m\n' "$STEP" >&2
	if ((SWAPPED)); then
		echo 'The new build is in place. To serve the previous one: scripts/deploy.sh --rollback' >&2
	else
		echo 'The site is still serving the previous build. Fix the problem and run with --force.' >&2
	fi
}

main() {
	for arg in "$@"; do
		case "$arg" in
			--force) FORCE=1 ;;
			--skip-backup) SKIP_BACKUP=1 ;;
			--rollback) ROLLBACK=1 ;;
			-h | --help)
				awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$SCRIPT"
				exit 0
				;;
			*) fail "unknown option $arg (see --help)" ;;
		esac
	done

	cd "$ROOT"

	# One deploy at a time.
	exec 9>"$ROOT/.deploy.lock"
	flock -n 9 || fail 'another deploy is running'

	if ((ROLLBACK)); then
		rollback
		return
	fi

	trap on_error ERR

	# deploy.sh re-runs itself (DEPLOY_FROM set) after a pull that changed it.
	if [[ -z "${DEPLOY_FROM:-}" ]]; then
		check_repository
		pull
	fi

	check_node
	install
	build
	migrate
	swap_and_reload
	health_check
	worker_health_check

	trap - ERR
	printf '\n\033[1;32mDeployed %s (%s)\033[0m\n' "$(git rev-parse --short HEAD)" "$(git log -1 --format=%s)"
}

check_repository() {
	step 'Checking the repository'
	local branch
	branch="$(git rev-parse --abbrev-ref HEAD)"
	[[ "$branch" == "$BRANCH" ]] || fail "on branch $branch, expected $BRANCH"
	# The legacy script ran `git reset --hard`; refuse instead, so changes made on the server
	# aren't lost silently.
	if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
		git status --short --untracked-files=no
		fail 'tracked files changed on the server: push them from a branch or `git checkout -- .` first'
	fi
}

pull() {
	step "Pulling $BRANCH"
	local from
	from="$(git rev-parse HEAD)"
	git fetch --quiet origin "$BRANCH"
	if [[ "$(git rev-parse "origin/$BRANCH")" == "$from" ]]; then
		if ((!FORCE)); then
			echo "Nothing new on $BRANCH ($(git rev-parse --short HEAD)). Use --force to redeploy."
			trap - ERR
			exit 0
		fi
		echo 'Nothing new, redeploying (--force).'
		return
	fi
	git --no-pager log --oneline --no-decorate "$from..origin/$BRANCH"
	git merge --ff-only --quiet "origin/$BRANCH"

	if ! git diff --quiet "$from" HEAD -- scripts/deploy.sh; then
		echo 'deploy.sh changed, running the new version.'
		DEPLOY_FROM="$from" exec bash "$SCRIPT" "${ARGS[@]}"
	fi
}

check_node() {
	STEP='checking the Node version'
	local wanted current
	wanted="$(tr -dc '0-9.' <.nvmrc)"
	current="$(node -p 'process.versions.node')"
	# .nvmrc is the minimum full version (security patches matter, not just the major).
	printf '%s\n%s\n' "$wanted" "$current" | sort -C -V ||
		fail "Node $wanted or newer required (.nvmrc), found $(node -v)"
}

install() {
	# npm ci wipes node_modules, which the running process still loads lazily: only reinstall
	# when package-lock.json or the Node version changed.
	local stamp=node_modules/.deploy-stamp wanted
	wanted="$(node -v) $(sha256sum package-lock.json | cut -d' ' -f1)"
	if [[ -f "$stamp" && "$(cat "$stamp")" == "$wanted" ]]; then
		step 'Dependencies unchanged, skipping npm ci'
		return
	fi
	step 'Installing dependencies (npm ci)'
	npm ci --no-audit --no-fund
	echo "$wanted" >"$stamp"
}

build() {
	step 'Building into build.next'
	rm -rf build.next
	BUILD_DIR=build.next npm run build
	[[ -f build.next/index.js ]] || fail 'the build did not produce build.next/index.js'
	[[ -f build.next/worker/index.js ]] || fail 'the build did not produce build.next/worker/index.js'
}

migrate() {
	step 'Checking for pending migrations'
	local pending
	pending="$(node scripts/db-pending.ts)"
	if [[ -z "$pending" ]]; then
		echo 'Database is up to date.'
		return
	fi
	echo "$pending"

	if ((SKIP_BACKUP)); then
		echo 'Skipping the database backup (--skip-backup).'
	else
		step 'Backing up the database'
		node scripts/db-backup.ts "${DEPLOY_BACKUP_DIR:-$ROOT/backups}"
	fi

	step 'Applying migrations'
	npm run db:migrate
}

swap_and_reload() {
	step 'Swapping in the new build'
	rm -rf build.prev
	if [[ -d build ]]; then
		mv build build.prev
	fi
	mv build.next build
	SWAPPED=1

	step 'Reloading PM2'
	pm2 startOrReload ecosystem.config.cjs --update-env
}

health_check() {
	step 'Checking /healthz'
	local port url
	port="$(node --env-file=.env -p 'process.env.PORT || 3000')"
	url="http://127.0.0.1:$port/healthz"
	for _ in $(seq 1 20); do
		if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
			echo "OK ($url)"
			return
		fi
		sleep 1
	done
	pm2 logs "$APP" --lines 30 --nostream || true
	fail "$url did not answer OK. Serve the previous build with: scripts/deploy.sh --rollback"
}

worker_health_check() {
	# The worker has no HTTP port: once connected to the database it writes .worker-heartbeat
	# with its PID (src/worker/main.ts). The old process may have written one too, so match the PID.
	step 'Checking the worker heartbeat'
	local pid
	for _ in $(seq 1 30); do
		pid="$(pm2 pid "$WORKER" 2>/dev/null | tr -dc '0-9')"
		if [[ -n "$pid" && "$pid" != 0 ]] && grep -qs "\"pid\":$pid[,}]" .worker-heartbeat; then
			echo "OK (pid $pid)"
			return
		fi
		sleep 1
	done
	pm2 logs "$WORKER" --lines 30 --nostream || true
	fail "$WORKER did not start. Serve the previous build with: scripts/deploy.sh --rollback"
}

rollback() {
	[[ -d build.prev ]] || fail 'there is no previous build (build.prev) to roll back to'
	step 'Rolling back to the previous build'
	rm -rf build.next
	mv build build.next
	mv build.prev build
	mv build.next build.prev
	pm2 startOrReload ecosystem.config.cjs --update-env
	health_check
	worker_health_check
	echo 'Serving the previous build. Run --rollback again to switch back.'
}

# Everything is in functions so bash has read the whole file before `git pull` can change it.
main "$@"
exit
