# Logs (Grafana Cloud)

The admin, its worker and `domingoasdez-app` write one JSON object per line to stdout/stderr, and
PM2 writes that to files. Grafana Alloy on the server reads those files, plus the nginx logs and
the legacy Laravel log, and sends everything to Grafana Cloud Logs (Loki). Search, dashboards and
alerts are in Grafana. The Alloy config is [alloy/config.alloy](../alloy/config.alloy).

## What the apps log

An entry (one line in the logs, wrapped here):

```json
{
	"time": "2026-10-25T10:00:00.000Z",
	"level": "warn",
	"scope": "storage",
	"msg": "could not delete a file",
	"requestId": "…",
	"userId": 7,
	"url": "/storage/media/images/x.jpg",
	"error": { "name": "S3ServiceException", "message": "…", "code": "…", "stack": "…" }
}
```

- **One line per request** (`logRequests` in `#lib/server/request-log.ts`, the first `handle`):
  `requestId`, `method`, `path` (no query string), `route`, `status`, `durationMs`, `userId`.
  5xx are `error`, `/healthz` is `debug`, everything else `info`. Static files are served by
  adapter-node before the hooks and are not logged. The public app logs the route instead of the
  path when the path holds an email or a token (`/conta/registar/verificar/[email]/[token]`).
- **Every entry made during a request** carries its `requestId` and `userId`
  (`#lib/server/request-context.ts`, AsyncLocalStorage).
- **Unexpected errors**: `handleError` logs `<METHOD> <path> failed` with the stack. The admin's
  error page shows the request id (`errorId`): search for it.
- **Worker**: `scope` is the job (`publish-social-media`, `club-birthdays:club #3`); every run logs
  its `durationMs` (`finished in` at `debug`, `failed after` at `error`).

In code, scope the logger per module and pass fields and the error after the message: plain objects
become fields, the first `Error` goes to `error` (name, message, code, stack, cause).

```ts
import { logger } from '#lib/server/log.ts';

const log = logger.child('clubs');

log.warn('could not clean up the replaced emblem', { url }, error);
```

Log ids, never emails, tokens, passwords or request bodies. `domingoasdez-app` has a copy of the
logger (`src/lib/server/logger.ts`, `request-log.ts`, `request-context.ts`): keep the two in sync.

| Variable           | Default | Meaning                                                                                    |
| ------------------ | ------- | ------------------------------------------------------------------------------------------ |
| `LOG_FORMAT`       | `text`  | `text` (readable, development) or `json`. Both `ecosystem.config.cjs` set `json`.          |
| `LOG_LEVEL`        | `info`  | Admin and public app: `debug` (also `/healthz`), `info` (requests), `warn` or `error`.     |
| `WORKER_LOG_LEVEL` | `info`  | Worker ([jobs.md](jobs.md)); its calls into `#lib/server` (storage, …) follow `LOG_LEVEL`. |

## Labels

Alloy sets few labels (Loki indexes them, so they stay low-cardinality); everything else is read
from the JSON with `| json`.

| Label          | Values                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `service_name` | `domingoasdez-app`, `domingoasdez-admin`, `domingoasdez-admin-worker`, `nginx`, `domingoasdez-legacy`      |
| `level`        | `debug`, `info`, `warn`, `error` (Laravel: `warning`, `critical`, …; nginx error log: `notice`, `crit`, …) |
| `host`         | Server hostname                                                                                            |
| `vhost`, `log` | nginx only: the site folder (`admin.domingoasdez.com`) and `access` / `error`                              |

Lines that are not JSON (Node warnings, crashes) get the level of their PM2 file: `info` from
`-out.log`, `error` from `-error.log`. Stack traces of a crash stay in one entry.

## Server setup (once)

1. **Grafana Cloud.** Create a free stack in an EU region (the logs hold user ids and IP
   addresses). In the stack's "Loki" / "Hosted logs" details, note the push URL
   (`https://logs-prod-<region>.grafana.net/loki/api/v1/push`) and the user (a number). Create an
   access policy token with only the `logs:write` scope.
2. **Install Alloy** from Grafana's apt repository:

   ```bash
   sudo mkdir -p /etc/apt/keyrings
   wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
   echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
   sudo apt-get update && sudo apt-get install alloy
   ```

3. **Config.** Copy the config from this repository and add the settings to `/etc/default/alloy`
   (keep the `CONFIG_FILE` and `CUSTOM_ARGS` lines the package put there), then
   `sudo chmod 600 /etc/default/alloy`:

   ```bash
   sudo cp alloy/config.alloy /etc/alloy/config.alloy
   ```

   ```ini
   GCLOUD_LOGS_URL=https://logs-prod-<region>.grafana.net/loki/api/v1/push
   GCLOUD_LOGS_USER=<user>
   GCLOUD_LOGS_TOKEN=<token>
   # PM2's log folder of the user that runs the apps.
   PM2_LOG_DIR=/home/<user>/.pm2/logs
   # storage/logs of the legacy site; empty when it runs on another server.
   LEGACY_LOG_DIR=/var/www/<legacy>/storage/logs
   ```

4. **Permissions.** Alloy runs as the `alloy` user. nginx logs belong to the `adm` group; home
   folders are usually closed to other users:

   ```bash
   sudo usermod -aG adm alloy
   sudo setfacl -m u:alloy:x /home/<user>
   sudo -u alloy head -c0 /home/<user>/.pm2/logs/domingoasdez-admin-out.log && echo pm2 ok
   sudo -u alloy ls /var/www/<legacy>/storage/logs > /dev/null && echo legacy ok
   ```

5. **Log rotation.** `pm2 install pm2-logrotate` keeps the PM2 files small. It copies and
   truncates, and Alloy skips the copies (`<app>-out__<date>.log`).
6. **Start** and check:

   ```bash
   sudo systemctl enable --now alloy
   sudo journalctl -u alloy -f
   ```

   Alloy's UI (`http://127.0.0.1:12345`, through `ssh -L 12345:127.0.0.1:12345 <server>`) shows
   every component and its errors. On the first start Alloy skips what the PM2 and nginx files
   already hold, and the Laravel entries older than 24 hours.

7. **Deploy** the admin and the public app: their `ecosystem.config.cjs` set `LOG_FORMAT=json`
   (`scripts/deploy.sh` reloads PM2 with `--update-env`).

After a change to `alloy/config.alloy`, copy it again and `sudo systemctl reload alloy`.

## Queries

In Grafana, Explore (Loki data source) or Drilldown → Logs.

| What                               | LogQL                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Errors of every app                | `{service_name=~"domingoasdez-.+", level="error"}`                                                                   |
| A request (id from the error page) | `{service_name=~"domingoasdez-.+"} \| json \| requestId="<id>"`                                                      |
| Slow requests                      | `{service_name="domingoasdez-app"} \| json \| durationMs > 1000`                                                     |
| One job                            | `{service_name="domingoasdez-admin-worker"} \| json \| scope=~"publish-social-media.*"`                              |
| Failed job runs                    | `{service_name="domingoasdez-admin-worker", level="error"} \|= "failed after"`                                       |
| What a user did                    | `{service_name=~"domingoasdez-.+"} \| json \| userId="123"`                                                          |
| nginx 5xx                          | `{service_name="nginx", log="access"} \| pattern "<_> - <_> [<_>] \"<_> <path> <_>\" <status> <_>" \| status >= 500` |
| Legacy site errors                 | `{service_name="domingoasdez-legacy", level=~"error\|critical\|alert\|emergency"}`                                   |

## Alerts

Grafana → Alerting → New alert rule, Loki data source, an email contact point. Starting points:

- App errors: `sum by (service_name) (count_over_time({service_name=~"domingoasdez-.+", level="error"}[5m])) > 10`
- Failed job runs: `sum(count_over_time({service_name="domingoasdez-admin-worker", level="error"} |= "failed after" [15m])) > 0`
- Server errors behind nginx: `sum(count_over_time({service_name="nginx", log="access"} | pattern "<_> - <_> [<_>] \"<_> <_> <_>\" <status> <_>" | status >= 500 [5m])) > 20`

## Volume

Most lines are nginx access lines (every request that reaches the server, static files
included) and the public app's request lines, about 300 bytes each, with Sunday's live pages as
the peak. Grafana Cloud's free tier limits ingestion per month: check the usage in the stack's
billing page. To cut it, drop nginx access lines with a `stage.drop` in `loki.process "nginx"`
(the apps log their own requests), or raise `LOG_LEVEL` to `warn` on the public app (errors
stay).
