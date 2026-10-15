import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';

/**
 * Field schemas for admin forms and the translation of zod issues into the admin's language.
 * Messages are resolved when the form is parsed, so they follow the request locale.
 */

type Issue = z.core.$ZodRawIssue;

const isBlank = (value: unknown) =>
	value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const formatBytes = (bytes: number) =>
	bytes >= 1024 * 1024
		? `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`
		: `${Math.round(bytes / 1024)} KB`;

/** zod issue → message in the request language. Passed to every `safeParse` by `parseForm`. */
export function localizeIssue(issue: Issue): string {
	switch (issue.code) {
		case 'invalid_type':
			return isBlank(issue.input) ? m.validation_required() : m.validation_invalid();
		case 'too_small': {
			const minimum = Number(issue.minimum);
			if (issue.origin === 'string') {
				return minimum <= 1 ? m.validation_required() : m.validation_min_length({ min: minimum });
			}
			if (issue.origin === 'number' || issue.origin === 'int') {
				return m.validation_min_value({ min: minimum });
			}
			return m.validation_invalid();
		}
		case 'too_big': {
			const maximum = Number(issue.maximum);
			if (issue.origin === 'string') return m.validation_max_length({ max: maximum });
			if (issue.origin === 'number' || issue.origin === 'int') {
				return m.validation_max_value({ max: maximum });
			}
			if (issue.origin === 'file') return m.validation_file_too_big({ max: formatBytes(maximum) });
			return m.validation_invalid();
		}
		case 'invalid_format':
			if (issue.format === 'email') return m.validation_email();
			if (issue.format === 'url') return m.validation_url();
			if (issue.format === 'date') return m.validation_date();
			return m.validation_invalid();
		default:
			return m.validation_invalid();
	}
}

/** Trims strings and turns blank ones into `undefined`, so "empty" and "missing" are the same. */
const blankToUndefined = (value: unknown) => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
};

/** A required value: blank input fails with "required". */
export function required<T extends z.ZodType>(schema: T) {
	return z.preprocess(blankToUndefined, schema);
}

/** An optional value: blank input becomes `null` (what the database stores). */
export function optional<T extends z.ZodType>(schema: T) {
	return z.preprocess(blankToUndefined, schema.optional()).transform((value) => value ?? null);
}

export const requiredText = (max: number) => required(z.string().max(max));
export const optionalText = (max: number) => optional(z.string().max(max));
export const optionalEmail = (max: number) => optional(z.email().max(max));
/** Only http(s) links: anything else could run script when the public site renders it. */
const httpUrl = (max: number) =>
	z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).max(max);
export const requiredUrl = (max: number) => required(httpUrl(max));
export const optionalUrl = (max: number) => optional(httpUrl(max));
/** `<input type="date">` value (`YYYY-MM-DD`). */
export const optionalDate = () => optional(z.iso.date());

const digits = z.string().regex(/^\d+$/, { error: () => m.validation_integer() });

/** Whole number in a range (e.g. a priority). */
export const integer = (min: number, max: number) =>
	digits.transform(Number).pipe(z.number().int().min(min).max(max));

/** Primary key of a related row (MySQL unsigned INT). Existence is checked by the action. */
const id = digits.transform(Number).pipe(z.number().int().min(1).max(4_294_967_295));
export const requiredId = () => required(id);
export const optionalId = () => optional(id);

/**
 * An optional `<input type="file">`. Browsers send an empty, nameless file when nothing is
 * chosen; that becomes `null`. `types` is checked against the browser's MIME type here and must
 * be verified again from the file contents (e.g. `sharp().metadata()`).
 */
export function optionalFile({
	maxBytes,
	types,
	typesLabel
}: {
	maxBytes: number;
	types: readonly string[];
	/** Shown in the error, e.g. "PNG, SVG". */
	typesLabel: string;
}) {
	return z
		.custom<File | undefined>((value) => value === undefined || value instanceof File)
		.transform((file) => (file && file.size > 0 ? file : null))
		.pipe(
			z
				.file()
				.max(maxBytes)
				.refine((file) => types.includes(file.type), {
					error: () => m.validation_file_type({ types: typesLabel })
				})
				.nullable()
		);
}
