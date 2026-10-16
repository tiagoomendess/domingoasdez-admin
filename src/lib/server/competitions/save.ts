import { eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { competitions } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { insertImageMedia } from '#lib/server/media-library.ts';
import { deleteFileIfUnused } from '#lib/server/media/index.ts';
import { storeUploadedPicture } from '#lib/server/pictures.ts';
import { discardImage, type StoredImage } from '#lib/server/storage/uploads.ts';
import { competitionColumns, competitionFormSchema, pictureTags } from './form';
import { competitionUsage, isCompetitionNameTaken, type Competition } from './index';

/**
 * Create (`existing` null) or update a competition (legacy `CompetitionController`): the logo is
 * stored as a content image and added to the media library. Fixed legacy bugs: the name was only
 * checked for uniqueness on create (a rename could duplicate it), and a failed logo upload on create
 * redirected back without any message. A replaced logo is deleted when nothing else uses it.
 */
export async function saveCompetition(
	formData: FormData,
	existing: Competition | null,
	user: AdminUser
) {
	const form = parseForm(competitionFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	if (data.name !== existing?.name && (await isCompetitionNameTaken(data.name, existing?.id))) {
		errors.name = [m.competitions_name_taken()];
	}
	if (!existing && !data.picture) errors.picture = [m.validation_required()];
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (data.picture) {
		const result = await storeUploadedPicture(data.picture, ['jpeg', 'png'], 'JPEG, PNG');
		if ('error' in result) return { failure: invalid({ picture: [result.error] }, values) };
		stored = result.stored;
	}

	const columns = { ...competitionColumns(data), ...(stored ? { picture: stored.url } : {}) };
	let saved: { competition: Competition; media: Record<string, unknown> | null };
	try {
		saved = await db.transaction(async (tx) => {
			const media = stored
				? await insertImageMedia(tx, {
						userId: user.id,
						image: stored,
						tags: pictureTags(data.name)
					})
				: null;
			let id: number;
			if (existing) {
				id = existing.id;
				const changes = changedColumns(existing, columns);
				if (Object.keys(changes).length) {
					await tx.update(competitions).set(changes).where(eq(competitions.id, id));
				}
			} else {
				[{ id }] = await tx.insert(competitions).values(columns).$returningId();
			}
			const [competition] = await tx.select().from(competitions).where(eq(competitions.id, id));
			return { competition, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	await audit({
		action: existing ? 'update' : 'create',
		model: 'Competition',
		oldValues: existing,
		newValues: saved.competition
	});
	if (stored && existing?.picture !== stored.url) await deleteFileIfUnused(existing?.picture);
	return { competition: saved.competition };
}

/**
 * Legacy `destroy`, which let the foreign keys cascade to every season, group and game. Now a
 * competition with games can't be deleted: its empty seasons and groups still go with it.
 */
export async function deleteCompetition(competition: Competition) {
	const { games } = await competitionUsage(competition.id);
	if (games > 0) return { message: m.competitions_delete_has_games({ count: games }) };
	await db.delete(competitions).where(eq(competitions.id, competition.id));
	await audit({ action: 'delete', model: 'Competition', oldValues: competition });
	return { ok: true };
}
