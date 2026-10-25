import { AsyncLocalStorage } from 'node:async_hooks';

/** Locals of the request being handled (`logRequests`), so log entries can carry its id and user. */
export const requestContext = new AsyncLocalStorage<App.Locals>();
