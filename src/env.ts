import { defineEnvVars } from '@sveltejs/kit/env';

/** Empty strings count as "not set" so `.env` files can list every key. */
function optionalString(value: string | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function flag(defaultValue: boolean) {
	return (value: string | undefined) => {
		const normalized = value?.trim().toLowerCase();
		if (!normalized) return defaultValue;
		if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
		if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
		throw new Error('Must be true or false');
	};
}

/** An http(s) origin or base URL, returned without a trailing slash. */
function httpUrl(fallback?: string) {
	return (value: string | undefined) => {
		const raw = optionalString(value) ?? fallback;
		if (raw === undefined) return undefined;
		let url: URL;
		try {
			url = new URL(raw);
		} catch {
			throw new Error('Must be an http(s) URL');
		}
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error('Must be an http(s) URL');
		}
		return raw.replace(/\/+$/, '');
	};
}

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'MySQL connection string of the legacy Laravel database (read/write). The schema is owned by Laravel migrations.',
		schema: (value) => {
			const raw = optionalString(value);
			if (!raw || !raw.startsWith('mysql://')) throw new Error('Must be a mysql:// URL');
			return raw;
		}
	},
	SESSION_SECRET: {
		description: 'HMAC secret that signs the admin session cookie. At least 32 random characters.',
		schema: (value) => {
			const secret = optionalString(value);
			if (!secret || secret.length < 32) throw new Error('Must be at least 32 characters long');
			return secret;
		}
	},
	PUBLIC_FRONTEND_URL: {
		description:
			'Public website (domingoasdez-app), used by the "Back to the site" link and the links in the worker\'s emails.',
		schema: httpUrl('https://domingoasdez.com'),
		public: true
	},
	MEDIA_BASE_URL: {
		description:
			'Origin of the legacy site. Serves /images/... assets and /storage/... files (redirecting to R2 when missing locally).',
		schema: httpUrl('http://localhost:8000')
	},
	MEDIA_CDN_ENABLED: {
		description:
			'Build /storage/... URLs from MEDIA_CDN_BASE_URL (R2 public domain) instead of MEDIA_BASE_URL.',
		schema: flag(false)
	},
	MEDIA_CDN_BASE_URL: {
		description:
			'Public domain of the R2 bucket (legacy R2_URL), e.g. https://cdn.domingoasdez.com.',
		schema: httpUrl('https://cdn.domingoasdez.com')
	},
	R2_ENDPOINT: {
		description: 'Cloudflare R2 S3 endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
		schema: httpUrl()
	},
	R2_ACCESS_KEY_ID: {
		description: 'R2 API token access key id (Object Read & Write on the uploads bucket).',
		schema: optionalString
	},
	R2_SECRET_ACCESS_KEY: {
		description: 'R2 API token secret access key.',
		schema: optionalString
	},
	R2_BUCKET: {
		description: 'R2 bucket shared with the legacy site (keys mirror the DB paths: storage/...).',
		schema: optionalString
	},
	R2_REGION: {
		description: 'R2 region. Always "auto" for Cloudflare.',
		schema: (value) => optionalString(value) ?? 'auto'
	},
	WORKER_JOBS: {
		description:
			'Jobs the background worker schedules (docs/jobs.md): comma-separated names from `npm run worker -- list`, or "all" (every ported job). Empty: none.',
		schema: (value): 'all' | string[] => {
			const names = (value ?? '')
				.split(',')
				.map((name) => name.trim())
				.filter(Boolean);
			return names.length === 1 && names[0] === 'all' ? 'all' : names;
		}
	},
	WORKER_DRY_RUN: {
		description:
			'Worker jobs log the mail and social media posts they would send instead of sending them. Production sets false.',
		schema: flag(true)
	},
	MAIL_DRIVER: {
		description:
			'Mail transport of the worker\'s emails. Only "smtp" (the site\'s own server, as in domingoasdez-app).',
		schema: (value) => optionalString(value)?.toLowerCase() ?? 'smtp'
	},
	MAIL_HOST: { description: 'SMTP host.', schema: optionalString },
	MAIL_PORT: {
		description: 'SMTP port (587, 465, …). Same default as domingoasdez-app.',
		schema: (value) => {
			const port = Number(optionalString(value) ?? 2525);
			if (!Number.isInteger(port) || port <= 0) throw new Error('Must be a port number');
			return port;
		}
	},
	MAIL_USERNAME: {
		description: 'SMTP username (empty: no authentication).',
		schema: optionalString
	},
	MAIL_PASSWORD: { description: 'SMTP password.', schema: optionalString },
	MAIL_ENCRYPTION: {
		description:
			'SMTP encryption: "ssl" (implicit TLS, also port 465), "tls" (STARTTLS required) or empty.',
		schema: (value) => optionalString(value)?.toLowerCase() ?? ''
	},
	MAIL_FROM_ADDRESS: {
		description: "From address of the worker's emails (legacy site_email).",
		schema: (value) => optionalString(value) ?? 'geral@domingoasdez.com'
	},
	MAIL_FROM_NAME: {
		description: "From name of the worker's emails (legacy site_name).",
		schema: (value) => optionalString(value) ?? 'Domingo às Dez'
	},
	FB_GRAPH_URL: {
		description:
			"Graph API origin of the worker's social media posts. Only changed to point local tests at a fake Graph API, so nothing gets published.",
		schema: httpUrl('https://graph.facebook.com')
	},
	FB_GRAPH_VERSION: {
		description: "Facebook Graph API version of the worker's social media posts (legacy: v24.0).",
		schema: (value) => {
			const version = optionalString(value) ?? 'v24.0';
			if (!/^v\d+\.\d+$/.test(version)) throw new Error('Must look like v24.0');
			return version;
		}
	},
	FB_PAGE_ID: { description: 'Facebook page the worker posts to.', schema: optionalString },
	FB_PAGE_ACCESS_TOKEN: {
		description: 'Page access token: Facebook posts and stories.',
		schema: optionalString
	},
	FB_SYSTEM_USER_TOKEN: {
		description: 'System user token: Instagram posts and stories.',
		schema: optionalString
	},
	IG_USER_ID: {
		description: 'Instagram business account the worker posts to.',
		schema: optionalString
	},
	SCORE_REPORT_CONSUMER_SHADOW: {
		description:
			'The score-report-consumer job only logs the scores it would set ("would update …") instead of writing them, to compare with the legacy job before the cutover.',
		schema: flag(false)
	},
	WORKER_LOG_LEVEL: {
		description: 'Worker log level: debug, info, warn or error.',
		schema: (value) => {
			const level = optionalString(value)?.toLowerCase() ?? 'info';
			if (level !== 'debug' && level !== 'info' && level !== 'warn' && level !== 'error') {
				throw new Error('Must be debug, info, warn or error');
			}
			return level;
		}
	}
});
