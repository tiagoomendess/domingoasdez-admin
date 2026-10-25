import { LOG_FORMAT, LOG_LEVEL } from '$app/env/private';
import { createLogger } from './logger.ts';
import { requestContext } from './request-context.ts';

/**
 * The admin's logger. Modules scope it (`const log = logger.child('clubs')`); the worker makes its
 * own with WORKER_LOG_LEVEL (src/worker/main.ts). Entries made while a request is handled carry its
 * id and user.
 */
export const logger = createLogger({
	level: LOG_LEVEL,
	format: LOG_FORMAT,
	context: () => {
		const locals = requestContext.getStore();
		return locals && { requestId: locals.requestId, userId: locals.user?.id };
	}
});
