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
				NODE_ENV: 'production'
			}
		}
	]
};
