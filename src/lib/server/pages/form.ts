import { z } from 'zod';
import { imageFile } from '#lib/server/articles/form.ts';
import { checkbox } from '#lib/server/forms.ts';
import { requiredText } from '#lib/server/validation.ts';

/** `pages.body` is a MySQL TEXT column: at most 65 535 bytes. */
export const BODY_MAX_BYTES = 65535;

/**
 * Same rules as the legacy `PageController@store/update`. The legacy controller had no limit on
 * the body; the action checks the column's byte size instead of failing in SQL.
 */
export const pageFormSchema = z.object({
	title: requiredText(155),
	name: requiredText(50),
	body: requiredText(BODY_MAX_BYTES),
	picture: imageFile(),
	visible: checkbox
});

export type PageForm = z.output<typeof pageFormSchema>;

/** Legacy media library tags of the picture: the title with spaces turned into commas. */
export const pictureTags = (title: string) => title.split(' ');

/** UTF-8 size of a stored body (accented letters take two bytes). */
export const byteLength = (value: string) => new TextEncoder().encode(value).length;
