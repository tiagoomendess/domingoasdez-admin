import type { AdminUser } from '#lib/auth/user.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Error {
			message: string;
			/** Correlates the page shown to the user with the server log line. */
			errorId?: string;
		}
		interface Locals {
			user: AdminUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
