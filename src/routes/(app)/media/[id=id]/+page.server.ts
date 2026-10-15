import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import type { AdminUser } from '#lib/auth/user.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { setFlash } from '#lib/server/flash.ts';
import { youtubeId } from '#lib/server/media/form.ts';
import { findMedia, mediaUsage, uploaderName, type Media } from '#lib/server/media/index.ts';
import { deleteMedia, updateMedia } from '#lib/server/media/save.ts';
import { mediaUrl } from '#lib/server/media.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadMedia(id: number) {
	const item = await findMedia(id);
	if (!item) error(404, { message: 'Not found' });
	return item;
}

/** Legacy: only the uploader or an admin may change or delete a media item. */
const isOwnerOrAdmin = (user: AdminUser, item: Media) =>
	item.userId === user.id || can(user.permissions, 'admin');

function requireOwnerOrAdmin(user: AdminUser, item: Media) {
	if (!isOwnerOrAdmin(user, item)) error(403, { message: 'Forbidden' });
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('media');
	const item = await loadMedia(params.id);
	const owner = isOwnerOrAdmin(user, item);
	const canDelete = owner && can(user.permissions, 'media.create');
	const [uploader, usage] = await Promise.all([
		uploaderName(item.userId),
		canDelete ? mediaUsage(item) : null
	]);
	return {
		media: {
			id: item.id,
			url: item.url,
			type: item.mediaType,
			tags: item.tags?.replaceAll(',', ', ') ?? '',
			visible: item.visible,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt
		},
		/** Where the file can be opened (stored uploads come from the media origin). */
		fileUrl: mediaUrl(item.url),
		thumbnail: mediaUrl(item.thumbnailUrl),
		youtubeId: item.mediaType === 'youtube' ? youtubeId(item.url) : null,
		uploader,
		usage,
		canEdit: owner && can(user.permissions, 'media.edit'),
		canDelete
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies }) => {
		const user = requirePermission('media.edit');
		const item = await loadMedia(params.id);
		requireOwnerOrAdmin(user, item);
		const result = await updateMedia(await request.formData(), item);
		if ('failure' in result) return result.failure;

		setFlash(cookies, { type: 'success', message: m.media_saved({ id: item.id }) });
		redirect(303, resolve('/(app)/media/[id=id]', { id: item.id }));
	},

	delete: async ({ params, cookies }) => {
		const user = requirePermission('media.create');
		const item = await loadMedia(params.id);
		requireOwnerOrAdmin(user, item);
		const { keptFile } = await deleteMedia(item);

		setFlash(cookies, {
			type: 'success',
			message: keptFile
				? m.media_deleted_file_kept({ id: item.id })
				: m.media_deleted({ id: item.id })
		});
		redirect(303, resolve('/(app)/media'));
	}
};
