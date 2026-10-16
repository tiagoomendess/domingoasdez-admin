import { eq } from 'drizzle-orm';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { competitionExists } from '#lib/server/competitions/index.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { db } from '#lib/server/db/index.ts';
import { seasons } from '#lib/server/db/schema.ts';
import { invalid, parseForm, type FieldErrors } from '#lib/server/forms.ts';
import { insertImageMedia } from '#lib/server/media-library.ts';
import { deleteFileIfUnused } from '#lib/server/media/index.ts';
import { storeUploadedPicture } from '#lib/server/pictures.ts';
import { discardImage, type StoredImage } from '#lib/server/storage/uploads.ts';
import { pictureTags, seasonColumns, seasonFormSchema } from './form';
import { seasonUsage, type Season } from './index';

/**
 * Create (`existing` null) or update a season (legacy `SeasonController@store/update`): the
 * optional picture overrides the competition's logo on the public site and is added to the media
 * library; "remove picture" clears it. Fixed legacy bugs: seasons were never audited, and the
 * "start after end" error didn't keep the form values. A replaced picture is deleted when nothing
 * else uses it.
 */
export async function saveSeason(formData: FormData, existing: Season | null, user: AdminUser) {
	const form = parseForm(seasonFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const { data, values } = form;

	const errors: FieldErrors = {};
	if (data.start_year > data.end_year) errors.end_year = [m.seasons_end_before_start()];
	if (
		data.competition_id !== existing?.competitionId &&
		!(await competitionExists(data.competition_id))
	) {
		errors.competition_id = [m.validation_not_found()];
	}
	if (Object.keys(errors).length) return { failure: invalid(errors, values) };

	let stored: StoredImage | null = null;
	if (data.picture) {
		const result = await storeUploadedPicture(data.picture, ['jpeg', 'png'], 'JPEG, PNG');
		if ('error' in result) return { failure: invalid({ picture: [result.error] }, values) };
		stored = result.stored;
	}

	const columns = {
		...seasonColumns(data),
		...(stored ? { picture: stored.url } : data.clear_picture ? { picture: null } : {})
	};
	let saved: { season: Season; media: Record<string, unknown> | null };
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
					await tx.update(seasons).set(changes).where(eq(seasons.id, id));
				}
			} else {
				[{ id }] = await tx.insert(seasons).values(columns).$returningId();
			}
			const [season] = await tx.select().from(seasons).where(eq(seasons.id, id));
			return { season, media };
		});
	} catch (error) {
		await discardImage(stored);
		throw error;
	}

	if (saved.media) await audit({ action: 'create', model: 'Media', newValues: saved.media });
	if (!existing || Object.keys(changedColumns(existing, saved.season)).length) {
		await audit({
			action: existing ? 'update' : 'create',
			model: 'Season',
			oldValues: existing,
			newValues: saved.season
		});
	}
	if (existing?.picture && existing.picture !== saved.season.picture) {
		await deleteFileIfUnused(existing.picture);
	}
	return { season: saved.season };
}

/**
 * Legacy `destroy`, which let the foreign keys cascade to the groups and their games. Now a
 * season with games can't be deleted: its empty groups still go with it.
 */
export async function deleteSeason(season: Season) {
	const { games } = await seasonUsage(season.id);
	if (games > 0) return { message: m.seasons_delete_has_games({ count: games }) };
	await db.delete(seasons).where(eq(seasons.id, season.id));
	await audit({ action: 'delete', model: 'Season', oldValues: season });
	return { ok: true };
}
