/**
 * Port of Laravel's `Str::slug` / `str_slug` (same as `domingoasdez-app`): ASCII-fold, lowercase,
 * replace non-alphanumeric runs with `-`, trim leading/trailing dashes.
 */
export function slugify(value: string): string {
	return value
		.replace(/ª/gi, 'a') // ª feminine ordinal
		.replace(/º/gi, 'o') // º masculine ordinal
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
