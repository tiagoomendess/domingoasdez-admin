import { z } from 'zod';
import {
	optional,
	optionalText,
	required,
	requiredId,
	requiredText
} from '#lib/server/validation.ts';

/**
 * Legacy `UserProfileController@update`: `picture` required (a URL or a `/storage/...` path),
 * `bio` up to 280 characters, `phone` up to 14 (the column allows 20).
 */
export const profileFormSchema = z.object({
	picture: requiredText(280),
	phone: optionalText(14),
	bio: optional(z.string().max(280))
});

/** Legacy `addPermission` / `removePermission`. */
export const permissionFormSchema = z.object({ permission_id: requiredId() });

/**
 * The legacy ban modal (`reason`, up to 155 characters: the column size). Its controller was
 * never written, so banning did nothing until now.
 */
export const banFormSchema = z.object({ reason: required(z.string().min(3).max(155)) });

/** Permissions an admin can't remove from themselves: they would lock themselves out. */
export const SELF_LOCKOUT_PERMISSIONS = ['admin', 'dashboard'];

/**
 * Who may grant a permission: an admin grants anything; anyone else only what they hold
 * themselves (legacy let anyone with `users` grant `admin`).
 */
export function canGrant(granter: readonly string[], permission: string): boolean {
	return granter.includes('admin') || (permission !== 'admin' && granter.includes(permission));
}
