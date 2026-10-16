import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db, type Transaction } from '#lib/server/db/index.ts';
import { players, transfers } from '#lib/server/db/schema.ts';
import { checkbox, invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { playerExists } from '#lib/server/players/index.ts';
import { teamExists } from '#lib/server/teams/index.ts';
import { optionalId, required, requiredId } from '#lib/server/validation.ts';
import { createsRepeat, playerTeamAfter, type TimelineEntry } from './timeline';
import { playerTransfers, toEntry, type Transfer } from './index';

/** Legacy `TransferController` rules; the player can't change on edit (it is their history). */
export const transferFormSchema = z.object({
	player_id: requiredId(),
	team_id: optionalId(),
	date: required(z.iso.date()),
	visible: checkbox
});

/** A calendar date as the stored instant (midnight UTC, like the legacy date picker). */
const dayStart = (date: string) => new Date(`${date}T00:00:00Z`);
const dayOf = (date: Date) => date.toISOString().slice(0, 10);

/** Sets the player's current team when the latest transfer changed (see `playerTeamAfter`). */
async function syncPlayer(
	tx: Transaction,
	playerId: number,
	before: TimelineEntry[],
	after: TimelineEntry[]
) {
	const teamId = playerTeamAfter(before, after);
	if (teamId === undefined) return null;
	const [player] = await tx.select().from(players).where(eq(players.id, playerId));
	if (!player || player.teamId === teamId) return null;
	await tx.update(players).set({ teamId }).where(eq(players.id, playerId));
	const [updated] = await tx.select().from(players).where(eq(players.id, playerId));
	return { old: player, new: updated };
}

async function auditPlayer(change: Awaited<ReturnType<typeof syncPlayer>>) {
	if (change) {
		await audit({
			action: 'update',
			model: 'Player',
			oldValues: change.old,
			newValues: change.new
		});
	}
}

/**
 * Create (`existing` null) or update a transfer. New rules (the legacy site had none):
 * - read in date order, two transfers in a row can't have the same team: a transfer must change
 *   the player's history
 * - only a change to the player's most recent transfer updates the player's current team (legacy
 *   overwrote it with any transfer, even an old one, and never on delete)
 */
export async function saveTransfer(formData: FormData, existing: Transfer | null) {
	const form = parseForm(transferFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;
	const playerId = existing?.playerId ?? data.player_id;

	const errors: FieldErrors = {};
	if (!existing && !(await playerExists(playerId))) errors.player_id = [m.validation_not_found()];
	if (data.team_id && data.team_id !== existing?.teamId && !(await teamExists(data.team_id))) {
		errors.team_id = [m.validation_not_found()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	// Same day as before: keep the stored time, so same-day transfers keep their order.
	const date = existing && dayOf(existing.date) === data.date ? existing.date : dayStart(data.date);
	const columns = { teamId: data.team_id, date, visible: data.visible };

	const rows = await playerTransfers(playerId);
	const before = rows.map(toEntry);
	const entry = { id: existing?.id ?? null, teamId: columns.teamId, date };
	const after = existing
		? before.map((row) => (row.id === existing.id ? entry : row))
		: [...before, entry];
	if (createsRepeat(before, after)) {
		return { failure: invalid({ team_id: [m.transfers_repeats()] }, values) };
	}

	if (existing && !Object.keys(changedColumns(existing, columns)).length) {
		return { transfer: existing };
	}
	const saved = await db.transaction(async (tx) => {
		let id: number;
		if (existing) {
			id = existing.id;
			await tx.update(transfers).set(changedColumns(existing, columns)).where(eq(transfers.id, id));
		} else {
			[{ id }] = await tx
				.insert(transfers)
				.values({ playerId, ...columns })
				.$returningId();
		}
		const [transfer] = await tx.select().from(transfers).where(eq(transfers.id, id));
		const player = await syncPlayer(
			tx,
			playerId,
			before,
			after.map((row) => (row.id === null ? { ...row, id } : row))
		);
		return { transfer, player };
	});

	await audit({
		action: existing ? 'update' : 'create',
		model: 'Transfer',
		oldValues: existing,
		newValues: saved.transfer
	});
	await auditPlayer(saved.player);
	return { transfer: saved.transfer, playerUpdated: saved.player !== null };
}

/**
 * Deletes a transfer, unless the transfers before and after it have the same team (they would
 * end up next to each other). Deleting the most recent one moves the player back to the team of
 * the one before.
 */
export async function deleteTransfer(transfer: Transfer) {
	const rows = await playerTransfers(transfer.playerId);
	const before = rows.map(toEntry);
	const after = before.filter((row) => row.id !== transfer.id);
	if (createsRepeat(before, after)) return { message: m.transfers_delete_repeats() };

	const player = await db.transaction(async (tx) => {
		await tx.delete(transfers).where(eq(transfers.id, transfer.id));
		return syncPlayer(tx, transfer.playerId, before, after);
	});
	await audit({ action: 'delete', model: 'Transfer', oldValues: transfer });
	await auditPlayer(player);
	return { ok: true };
}
