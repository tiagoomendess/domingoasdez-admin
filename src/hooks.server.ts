import { json, redirect } from '@sveltejs/kit';
import { sequence, type Handle, type HandleServerError } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { loginUrl } from '#lib/server/auth/redirect.ts';
import { optOutOfRocketLoader } from '#lib/server/cloudflare.ts';
import {
	endSession,
	readSession,
	refreshSession,
	sessionMatchesPassword
} from '#lib/server/auth/session.ts';
import { loadAdmin } from '#lib/server/auth/users.ts';

/** Routes reachable without a session. Everything else requires a signed-in admin. */
const PUBLIC_PATHS = new Set(['/login', '/healthz']);

const handleLocale: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					optOutOfRocketLoader(
						html
							.replace('%paraglide.lang%', locale)
							.replace('%paraglide.dir%', getTextDirection(locale))
							.replace('%theme.class%', event.cookies.get('theme') === 'dark' ? 'dark' : '')
					)
			}
		)
	);

const handleAuth: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const session = await readSession(event.cookies);
	if (session) {
		const admin = await loadAdmin(session.u);
		if (admin && (await sessionMatchesPassword(session, admin.passwordHash))) {
			event.locals.user = admin.user;
			await refreshSession(event.cookies, session);
		} else {
			// Revoked access, banned account or changed password.
			endSession(event.cookies);
		}
	}

	if (!event.locals.user && !PUBLIC_PATHS.has(event.url.pathname)) {
		if (event.url.pathname.startsWith('/api/')) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}
		// Thrown (not returned) so SvelteKit formats it for page loads, data requests and
		// enhanced form submissions alike.
		redirect(303, loginUrl(event.url.pathname + event.url.search));
	}

	return resolve(event);
};

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	// CSP (incl. frame-ancestors) is configured in vite.config.ts.
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), payment=(), geolocation=(self)'
	);
	if (event.locals.user) response.headers.set('Cache-Control', 'private, no-store');
	return response;
};

export const handle = sequence(handleSecurityHeaders, handleLocale, handleAuth);

export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind !== 'unknown') return;
	const errorId = crypto.randomUUID();
	console.error(`[error ${errorId}] ${event.request.method} ${event.url.pathname}`, error);
	return { errorId };
};
