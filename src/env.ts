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
		description: 'Public website, used by the "Back to the site" link.',
		schema: httpUrl('https://app.domingoasdez.com'),
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
	}
});
