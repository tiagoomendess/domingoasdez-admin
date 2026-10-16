import { eq } from 'drizzle-orm';
import { fromLocalInput } from '#lib/datetime.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { scoreReportBans } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { userExists } from '#lib/server/users.ts';
import { createBanSchema, DAY_MS, isActive, targetErrors, updateBanSchema } from './form';
import { findBan, type BanRow } from './index';

/** Legacy `ScoreReportBanController@store`: banned for `ban_days` from now. */
export async function createBan(formData: FormData) {
	const form = parseForm(createBanSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const data = form.data;
	const target = { uuid: data.uuid, userId: data.user_id, ipAddress: data.ip_address };

	const errors = targetErrors(target, data.ip_ban);
	if (data.user_id && !(await userExists(data.user_id))) {
		errors.user_id = [m.score_bans_user_missing()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, form.values) };

	const [{ id }] = await db
		.insert(scoreReportBans)
		.values({
			...target,
			userAgent: data.user_agent,
			reason: data.reason,
			shadowBan: data.shadow_ban,
			ipBan: data.ip_ban,
			expiresAt: new Date(Date.now() + data.ban_days * DAY_MS)
		})
		.$returningId();
	const ban = (await findBan(id))!;
	await audit({ action: 'create', model: 'ScoreReportBan', newValues: ban });
	return { ban };
}

async function applyChanges(ban: BanRow, next: Partial<BanRow>) {
	const changes = changedColumns(ban, next);
	if (!Object.keys(changes).length) return ban;
	await db.update(scoreReportBans).set(changes).where(eq(scoreReportBans.id, ban.id));
	const updated = (await findBan(ban.id))!;
	await audit({ action: 'update', model: 'ScoreReportBan', oldValues: ban, newValues: updated });
	return updated;
}

/** Legacy `ScoreReportBanController@update`: expiry (admin's timezone), reason, switches. */
export async function updateBan(formData: FormData, ban: BanRow, timeZone: string) {
	const form = parseForm(updateBanSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const data = form.data;

	const expiresAt = fromLocalInput(data.expires_at, timeZone);
	// Legacy only checked this on create: a ban on the whole IP without an IP matches nothing.
	const errors = targetErrors(ban, data.ip_ban);
	if (!expiresAt) errors.expires_at = [m.validation_date()];
	if (Object.keys(errors).length || !expiresAt) return { failure: invalid(errors, form.values) };

	const updated = await applyChanges(ban, {
		expiresAt,
		reason: data.reason,
		shadowBan: data.shadow_ban,
		ipBan: data.ip_ban
	});
	return { ban: updated };
}

/** End an active ban now (keeps it in the history, unlike deleting it). */
export async function liftBan(ban: BanRow) {
	if (!isActive(ban.expiresAt)) return { ban };
	return { ban: await applyChanges(ban, { expiresAt: new Date() }) };
}

export async function deleteBan(ban: BanRow) {
	await db.delete(scoreReportBans).where(eq(scoreReportBans.id, ban.id));
	await audit({ action: 'delete', model: 'ScoreReportBan', oldValues: ban });
}
