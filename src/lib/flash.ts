/** A one-time message shown as a toast after a redirect (see `#lib/server/flash.ts`). */
export type Flash = {
	type: 'success' | 'error';
	message: string;
};
