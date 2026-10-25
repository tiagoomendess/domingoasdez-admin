import { and, eq, ne } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db, type Transaction } from '#lib/server/db/index.ts';
import { teamAgents, teamAgentsHistory } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { logger } from '#lib/server/log.ts';
import { insertImageMedia, isInMediaLibrary } from '#lib/server/media-library.ts';
import { playerExists } from '#lib/server/players/index.ts';
import { readPictureInput } from '#lib/server/players/save.ts';
import { IMAGE_LIMITS } from '#lib/server/storage/images.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import { discardImage, storeImage, type StoredImage } from '#lib/server/storage/uploads.ts';
import { teamExists } from '#lib/server/teams/index.ts';
import { agentColumns, agentFormSchema, historyFormSchema, pictureTags, startOfDay } from './form';
import { automaticEntry, changeProblem, type HistoryEntry, type HistoryProblem } from './history';
import { agentHistoryRows, type HistoryRow, type TeamAgent } from './index';

const log = logger.child('team-agents');

type AuditRows = { action: 'create' | 'update' | 'delete'; old?: HistoryRow; new?: HistoryRow }[];

const toEntry = (row: HistoryRow): HistoryEntry => ({
	id: row.id,
	teamId: row.teamId,
	agentType: row.agentType,
	startedAt: row.startedAt
});

/**
 * Legacy history entry for a coach's new team or role (`createHistoryRecord()`), following the
 * history rules (see `automaticEntry`). Returns the rows to audit.
 */
async function recordHistory(
	tx: Transaction,
	agent: TeamAgent,
	isNew: boolean
): Promise<AuditRows> {
	const rows = isNew ? [] : await agentHistoryRows(agent.id);
	const current = { teamId: agent.teamId, agentType: agent.agentType };
	const now = new Date();
	const decision = automaticEntry(rows.map(toEntry), current, now);
	const find = async (id: number) =>
		(await tx.select().from(teamAgentsHistory).where(eq(teamAgentsHistory.id, id)))[0];

	switch (decision.kind) {
		case 'add': {
			const [{ id }] = await tx
				.insert(teamAgentsHistory)
				.values({ teamAgentId: agent.id, ...current, startedAt: now })
				.$returningId();
			return [{ action: 'create', new: await find(id) }];
		}
		case 'update': {
			const old = await find(decision.id);
			await tx.update(teamAgentsHistory).set(current).where(eq(teamAgentsHistory.id, decision.id));
			return [{ action: 'update', old, new: await find(decision.id) }];
		}
		case 'delete': {
			const old = await find(decision.id);
			await tx.delete(teamAgentsHistory).where(eq(teamAgentsHistory.id, decision.id));
			return [{ action: 'delete', old }];
		}
		default:
			return [];
	}
}

async function auditHistory(rows: AuditRows) {
	for (const row of rows) {
		await audit({
			action: row.action,
			model: 'TeamAgentHistory',
			oldValues: row.old ?? null,
			newValues: row.new ?? null
		});
	}
}

/**
 * Create (`existing` null) or update a coach (legacy `TeamAgentController@store/update`):
 * - a picture (upload or link) is cropped square, stored and added to the media library
 * - a new coach, or a new team or role, records a history entry starting now
 * Fixed legacy bugs: the picture's media library row got no thumbnail, and a replaced picture was
 * never deleted (now it is, unless something else still uses the file).
 * Returns the saved row, or the `fail()` the action must return.
 */
export async function saveAgent(formData: FormData, existing: TeamAgent | null, user: AdminUser) {
	const form = parseForm(agentFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	if (data.team_id && data.team_id !== existing?.teamId && !(await teamExists(data.team_id))) {
		errors.team_id = [m.validation_not_found()];
	}
	if (
		data.player_id &&
		data.player_id !== existing?.playerId &&
		!(await playerExists(data.player_id))
	) {
		errors.player_id = [m.validation_not_found()];
	}
	const picture = await readPictureInput(data, errors);
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (picture) {
		try {
			stored = await storeImage(picture.bytes, picture.format, {
				resize: { fit: 'square', size: IMAGE_LIMITS.squareSize },
				thumbnail: true
			});
		} catch (error) {
			log.error('picture upload failed', error);
			const field = data.picture ? 'picture' : 'picture_url';
			return { failure: invalid({ [field]: [m.form_upload_failed()] }, values) };
		}
	}

	const columns = { ...agentColumns(data), ...(stored ? { picture: stored.url } : {}) };
	const roleChanged =
		!existing || existing.teamId !== columns.teamId || existing.agentType !== columns.agentType;

	let saved: { agent: TeamAgent; media: Record<string, unknown> | null; history: AuditRows };
	try {
		saved = await db.transaction(async (tx) => {
			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length) {
					await tx.update(teamAgents).set(changes).where(eq(teamAgents.id, id));
				}
			} else {
				[{ id }] = await tx.insert(teamAgents).values(columns).$returningId();
			}
			const [agent] = await tx.select().from(teamAgents).where(eq(teamAgents.id, id));
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: pictureTags(agent.name)
					})
				: null;
			const history = roleChanged ? await recordHistory(tx, agent, !existing) : [];
			return { agent, media, history };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	await audit({
		action: existing ? 'update' : 'create',
		model: 'TeamAgent',
		oldValues: existing,
		newValues: saved.agent
	});
	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await auditHistory(saved.history);

	if (stored && existing?.picture && existing.picture !== stored.url) {
		await deleteReplacedPicture(existing.picture, existing.id);
	}
	return { agent: saved.agent };
}

/** A replaced picture is deleted unless the media library or another coach still shows it. */
async function deleteReplacedPicture(url: string, agentId: number) {
	try {
		const [other] = await db
			.select({ id: teamAgents.id })
			.from(teamAgents)
			.where(and(eq(teamAgents.picture, url), ne(teamAgents.id, agentId)))
			.limit(1);
		if (other || (await isInMediaLibrary(db, url))) return;
		await deleteFile(url);
	} catch (error) {
		log.warn('could not clean up the replaced picture', error);
	}
}

/**
 * Legacy `destroy`. Fixed legacy bug: the history's foreign key has no cascade, so deleting a
 * coach with history failed in SQL; the history is deleted with the coach now. The picture stays
 * in the media library.
 */
export async function deleteAgent(agent: TeamAgent) {
	const history = await db.transaction(async (tx) => {
		const rows = await tx
			.select()
			.from(teamAgentsHistory)
			.where(eq(teamAgentsHistory.teamAgentId, agent.id));
		await tx.delete(teamAgentsHistory).where(eq(teamAgentsHistory.teamAgentId, agent.id));
		await tx.delete(teamAgents).where(eq(teamAgents.id, agent.id));
		return rows;
	});
	await auditHistory(history.map((row) => ({ action: 'delete', old: row })));
	await audit({ action: 'delete', model: 'TeamAgent', oldValues: agent });
}

/** History forms live in a modal: their failures are kept apart from the coach form's. */
export type HistoryFailure = {
	history: { errors: FieldErrors; values: Record<string, string>; message: string | null };
};

const historyMessage = (problem: HistoryProblem) =>
	problem === 'repeated' ? m.team_agents_history_repeated() : m.team_agents_history_same_day();

/**
 * Adds or edits a history entry (legacy `TeamAgentHistoryController@store/update`), refusing
 * changes that break the history rules: the same team and role twice in a row, or two entries
 * on the same day.
 */
export async function saveHistoryEntry(formData: FormData, agent: TeamAgent) {
	const form = parseForm(historyFormSchema, formData);
	const fail = (errors: FieldErrors, message: string | null = null) => ({
		failure: { history: { errors, values: form.values, message } } satisfies HistoryFailure
	});
	if (!form.success) return fail(form.errors);
	const { data } = form;

	if (data.team_id && !(await teamExists(data.team_id))) {
		return fail({ team_id: [m.validation_not_found()] });
	}

	const rows = await agentHistoryRows(agent.id);
	const existing = data.history_id ? rows.find((row) => row.id === data.history_id) : null;
	if (data.history_id && !existing) return fail({}, m.team_agents_history_missing());

	const entry = {
		id: existing?.id ?? null,
		teamId: data.team_id,
		agentType: data.agent_type,
		startedAt: startOfDay(data.started_at)
	};
	const before = rows.map(toEntry);
	const after = existing
		? before.map((row) => (row.id === existing.id ? entry : row))
		: [...before, entry];
	const problem = changeProblem(before, after);
	if (problem) return fail({}, historyMessage(problem));

	const columns = { teamId: entry.teamId, agentType: entry.agentType, startedAt: entry.startedAt };
	if (existing) {
		const changes = changedColumns(existing, columns);
		if (!Object.keys(changes).length) return { ok: true };
		await db.update(teamAgentsHistory).set(changes).where(eq(teamAgentsHistory.id, existing.id));
		const [row] = await db
			.select()
			.from(teamAgentsHistory)
			.where(eq(teamAgentsHistory.id, existing.id));
		await auditHistory([{ action: 'update', old: existing, new: row }]);
	} else {
		const [{ id }] = await db
			.insert(teamAgentsHistory)
			.values({ teamAgentId: agent.id, ...columns })
			.$returningId();
		const [row] = await db.select().from(teamAgentsHistory).where(eq(teamAgentsHistory.id, id));
		await auditHistory([{ action: 'create', new: row }]);
	}
	return { ok: true };
}

/** Deletes an entry, unless that would leave the same team and role twice in a row. */
export async function deleteHistoryEntry(agent: TeamAgent, historyId: number) {
	const rows = await agentHistoryRows(agent.id);
	const entry = rows.find((row) => row.id === historyId);
	if (!entry) return { message: m.team_agents_history_missing() };

	const before = rows.map(toEntry);
	const problem = changeProblem(
		before,
		before.filter((row) => row.id !== historyId)
	);
	if (problem) return { message: m.team_agents_history_delete_repeats() };

	await db.delete(teamAgentsHistory).where(eq(teamAgentsHistory.id, historyId));
	await auditHistory([{ action: 'delete', old: entry }]);
	return { ok: true };
}
