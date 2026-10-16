import { z } from 'zod';
import { PERMISSIONS } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { required } from '#lib/server/validation.ts';

/**
 * Legacy `PermissionController`: a required name up to 100 characters. Names now follow the
 * convention the code checks (`resource`, `resource.create`, `resource.edit`: lowercase letters,
 * digits, `_` and `-`), and must be unique (checked by the action; legacy allowed duplicates).
 */
export const permissionFormSchema = z.object({
	name: required(
		z
			.string()
			.max(100)
			.regex(/^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/, { error: () => m.permissions_name_format() })
	)
});

const KNOWN = new Set<string>(PERMISSIONS);

/** The admin (and the legacy site) look these names up in code. */
export const isUsedByCode = (name: string) => KNOWN.has(name);

/** Renaming or deleting them would lock every admin out. */
export const LOCKOUT = ['admin', 'dashboard'];

/** Names the code checks that have no row yet: only full admins pass those checks today. */
export const missingPermissions = (existing: string[]) => {
	const have = new Set(existing);
	return PERMISSIONS.filter((name) => !have.has(name));
};
