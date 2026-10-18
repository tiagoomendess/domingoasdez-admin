import { z } from 'zod';
import { isLocalDateTime } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { checkbox } from '#lib/server/forms.ts';
import { integer, optional, optionalId, required } from '#lib/server/validation.ts';

/** Legacy validation (its slider stopped at 60 days). */
export const MAX_BAN_DAYS = 120;

const reason = required(z.string().min(3).max(255));
const ip = z.union([z.ipv4(), z.ipv6()], { error: () => m.score_bans_ip_invalid() });

/** Legacy `ScoreReportBanController@store`. */
export const createBanSchema = z.object({
	ban_days: required(integer(1, MAX_BAN_DAYS)),
	reason,
	// The public site's device id (a v4 UUID, 36 characters; the column holds 40).
	uuid: optional(z.string().min(20).max(40)),
	user_id: optionalId(),
	ip_address: optional(ip),
	user_agent: optional(z.string().min(3).max(255)),
	shadow_ban: checkbox,
	ip_ban: checkbox
});

/**
 * Legacy `ScoreReportBanController@update`: the expiry, the reason and the two switches (who is
 * banned can't change). `expires_at` is read in the admin's timezone by the action.
 */
export const updateBanSchema = z.object({
	expires_at: required(z.string().refine(isLocalDateTime, { error: () => m.validation_date() })),
	reason,
	shadow_ban: checkbox,
	ip_ban: checkbox
});

type Target = { uuid: string | null; userId: number | null; ipAddress: string | null };

/** Legacy checks: something to match on, and an IP for a ban on the whole IP. */
export function targetErrors(target: Target, ipBan: boolean): Record<string, string[]> {
	if (!target.uuid && !target.userId && !target.ipAddress) {
		return { uuid: [m.score_bans_target_required()] };
	}
	if (ipBan && !target.ipAddress) return { ip_ban: [m.score_bans_ip_ban_needs_ip()] };
	return {};
}

/** A ban applies until `expires_at` (same check as the legacy `findMatch` and the public app). */
export const isActive = (expiresAt: Date | null, now = new Date()) =>
	expiresAt !== null && expiresAt > now;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Ban length when a report is marked fake (legacy `ScoreReport::banUser`). */
export const FAKE_REPORT_BAN_DAYS = 15;

export type BanTarget = {
	uuid: string | null;
	userId: number | null;
	ipAddress: string | null;
	userAgent: string | null;
};

/**
 * Legacy `ScoreReportBan::findMatch`: an active ban covers the sender when it has the same device
 * or user, bans their whole IP, or has the same IP and browser. Legacy compared user ids with
 * `==`, so a sender without a user matched any user-less ban that shared their IP.
 */
export function banMatches(
	ban: Pick<BanTarget, 'uuid' | 'userId' | 'ipAddress' | 'userAgent'> & { ipBan: boolean },
	target: BanTarget
): boolean {
	if (target.uuid && ban.uuid === target.uuid) return true;
	if (target.userId && ban.userId === target.userId) return true;
	if (!target.ipAddress || ban.ipAddress !== target.ipAddress) return false;
	return ban.ipBan || ban.userAgent === target.userAgent;
}
