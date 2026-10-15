import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { can, type Permission } from '#lib/auth/permissions.ts';
import type { AdminUser } from '#lib/auth/user.ts';
import { loginUrl } from './redirect';

/** The signed-in admin. `hooks.server.ts` already sends anonymous requests to /login. */
export function requireUser(): AdminUser {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) redirect(303, loginUrl(event.url.pathname + event.url.search));
	return user;
}

/**
 * Call at the top of every load, form action and endpoint that reads or writes an entity
 * (`requirePermission('articles.edit')`). Layout loads alone do not protect actions or
 * nested loads, so each one checks for itself.
 */
export function requirePermission(permission: Permission): AdminUser {
	const user = requireUser();
	if (!can(user.permissions, permission)) error(403, { message: 'Forbidden' });
	return user;
}

/**
 * For data several sections need (e.g. the user options behind every "user" select): passes
 * with any one of `permissions`.
 */
export function requireAnyPermission(permissions: readonly Permission[]): AdminUser {
	const user = requireUser();
	if (!permissions.some((permission) => can(user.permissions, permission))) {
		error(403, { message: 'Forbidden' });
	}
	return user;
}
