// PM2 process file, same setup as domingoasdez-app. Deploys go through scripts/deploy.sh (build,
// migrations, `pm2 startOrReload ecosystem.config.cjs`). Runtime settings (PORT, ORIGIN, …) live in .env.
module.exports = {
	apps: [
		{
			name: 'domingoasdez-admin',
			script: './build/index.js',
			cwd: __dirname,
			node_args: '--env-file=.env',
			// Login throttling is in memory: keep a single instance (see src/lib/server/auth/throttle.ts).
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			max_memory_restart: '512M',
			env: {
				NODE_ENV: 'production',
				// JSON lines for Grafana Alloy (docs/logging.md). Set here, it wins over .env.
				LOG_FORMAT: 'json'
			}
		},
		{
			// Background jobs (docs/jobs.md). Which jobs run is WORKER_JOBS in .env.
			name: 'domingoasdez-admin-worker',
			script: './build/worker/index.js',
			cwd: __dirname,
			node_args: '--env-file=.env --enable-source-maps',
			// One scheduler: a second instance would only skip runs on the MySQL job locks.
			instances: 1,
			exec_mode: 'fork',
			autorestart: true,
			// Image generation decodes and composes full-size pictures.
			max_memory_restart: '768M',
			// On SIGINT the worker stops scheduling and waits up to 50 s for running jobs.
			kill_timeout: 60_000,
			env: {
				NODE_ENV: 'production',
				// JSON lines for Grafana Alloy (docs/logging.md). Set here, it wins over .env.
				LOG_FORMAT: 'json'
			}
		}
	]
};
