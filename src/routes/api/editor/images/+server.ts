import { json } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { imageFile } from '#lib/server/articles/form.ts';
import { uploadBodyImage } from '#lib/server/articles/save.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { localizeIssue } from '#lib/server/validation.ts';
import type { RequestHandler } from './$types';

/**
 * Upload of an image into a rich text (article or page body) from the editor. Like the legacy
 * `CKEditorController`, it needs the `media` permission (it adds to the media library).
 * Answers `{ url }` (to insert in the text) or `{ message }` with a 400.
 */
export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermission('media');
	const formData = await request.formData().catch(() => null);
	const parsed = imageFile().safeParse(formData?.get('file') ?? undefined, {
		error: localizeIssue
	});
	if (!parsed.success) return json({ message: parsed.error.issues[0].message }, { status: 400 });
	if (!parsed.data) return json({ message: m.validation_required() }, { status: 400 });

	const result = await uploadBodyImage(parsed.data, user);
	if ('error' in result) return json({ message: result.error }, { status: 400 });
	return json(result);
};
