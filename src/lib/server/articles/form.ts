import { z } from 'zod';
import { checkbox } from '#lib/server/forms.ts';
import {
	optionalDate,
	optionalFile,
	optionalId,
	optionalText,
	requiredText
} from '#lib/server/validation.ts';

/** Legacy `editor1: max:65000`. */
export const TEXT_MAX_LENGTH = 65000;
/** Same limits as the legacy editor upload (`CKEditorController`): JPEG or PNG, 20000 KB. */
export const IMAGE_MAX_BYTES = 20000 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

export const imageFile = () =>
	optionalFile({ maxBytes: IMAGE_MAX_BYTES, types: IMAGE_TYPES, typesLabel: 'JPEG, PNG' })
		// Read-only forms have no file input, so the field may be missing altogether.
		.optional()
		.transform((file) => file ?? null);

/**
 * Same rules as the legacy `ArticleController@store/update`. The date is required on create and
 * fixed afterwards (the legacy edit form has no date), which the action enforces. `cover` is new:
 * a picture uploaded with the article, added to the media library and used as its cover instead
 * of `media_id`.
 */
export const articleFormSchema = z.object({
	title: requiredText(155),
	description: optionalText(280),
	media_id: optionalId(),
	cover: imageFile(),
	text: requiredText(TEXT_MAX_LENGTH),
	date: optionalDate(),
	tags: optionalText(280),
	visible: checkbox
});

export type ArticleForm = z.output<typeof articleFormSchema>;

/** Legacy drops one trailing `.`, `!` or `?` from the title. */
export function cleanTitle(title: string): string {
	return /[.!?]$/.test(title) ? title.slice(0, -1) : title;
}

/** Legacy `str_replace(', ', ',', $tags ?? '')`: never null, no space after commas. */
export function cleanTags(tags: string | null): string {
	return (tags ?? '').replaceAll(', ', ',');
}

/** A calendar date (`YYYY-MM-DD`) as the midnight UTC instant legacy stores in `articles.date`. */
export function articleDate(date: string): Date {
	return new Date(`${date}T00:00:00Z`);
}

/** `articles.date` back to the `YYYY-MM-DD` of the date input. */
export function articleDateValue(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Media library tags of an uploaded cover: the article tags, then the title. */
export function coverTags(form: Pick<ArticleForm, 'title' | 'tags'>): string[] {
	const tags = cleanTags(form.tags)
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
	return [...tags, cleanTitle(form.title)];
}

/** Legacy tags of an image uploaded into the text (`'ckeditor-upload,' . $originName`). */
export function bodyImageTags(fileName: string): string[] {
	return ['ckeditor-upload', fileName.replaceAll(',', ' ').slice(0, 100)];
}

/** Legacy `postOnFacebook`: an optional message, up to 280 characters. */
export const facebookPostSchema = z.object({ message: optionalText(280) });

/**
 * Legacy caption of the article's Facebook post: the message, or the title without one, and a
 * pointer to the link, commented under the post.
 */
export function facebookCaption(message: string | null, title: string): string {
	return `${message || title}\n\n🔗 Link nos comentários`;
}
