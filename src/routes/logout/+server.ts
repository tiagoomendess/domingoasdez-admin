import { redirect } from '@sveltejs/kit';
import { audit } from '#lib/server/audit.ts';
import { endSession } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

// POST only (SvelteKit checks the Origin of form posts), so a link or image can't sign you out.
export const POST: RequestHandler = async ({ cookies, locals }) => {
	if (locals.user) {
		const { id, name, email } = locals.user;
		await audit({
			action: 'logout',
			model: 'User',
			oldValues: { id, name, email },
			extraInfo: 'admin'
		});
	}
	endSession(cookies);
	redirect(303, '/login');
};
