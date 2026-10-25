import { isHttpError, isRedirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { LogLevel, Logger } from './logger.ts';
import { requestContext } from './request-context.ts';

export type RequestSummary = {
	requestId: string;
	method: string;
	/** Without the query string (searches, `redirectTo`). */
	path: string;
	route: string | null;
	status: number;
	durationMs: number;
	userId?: number;
};

/** Level and line of a finished request: errors for 5xx, the uptime checks only at debug level. */
export function requestEntry(request: RequestSummary): {
	level: LogLevel;
	message: string;
	fields: RequestSummary;
} {
	const { method, path, route, status, durationMs } = request;
	const level = status >= 500 ? 'error' : route === '/healthz' ? 'debug' : 'info';
	return { level, message: `${method} ${path} ${status} ${durationMs}ms`, fields: request };
}

/**
 * First `handle`: one line per request with its id, which `handleError` and the error page reuse,
 * and the request context for the other entries. Static files (`/_app/immutable/…`) are served by
 * adapter-node before the hooks and not logged.
 */
export function logRequests(log: Logger): Handle {
	return ({ event, resolve }) => {
		event.locals.requestId = crypto.randomUUID();
		return requestContext.run(event.locals, async () => {
			const started = performance.now();
			// SvelteKit answers 500 when `handle` or `resolve` throws something else.
			let status = 500;
			try {
				const response = await resolve(event);
				status = response.status;
				return response;
			} catch (error) {
				// Thrown by a later `handle` (the login redirect); SvelteKit turns them into responses.
				if (isRedirect(error) || isHttpError(error)) status = error.status;
				throw error;
			} finally {
				const { level, message, fields } = requestEntry({
					requestId: event.locals.requestId,
					method: event.request.method,
					path: event.url.pathname,
					route: event.route.id,
					status,
					durationMs: Math.round(performance.now() - started),
					userId: event.locals.user?.id
				});
				log[level](message, fields);
			}
		});
	};
}
