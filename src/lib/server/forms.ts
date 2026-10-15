import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { FieldErrors, FormFailure } from '#lib/forms.ts';
import { localizeIssue } from './validation';

export type { FieldErrors, FormFailure } from '#lib/forms.ts';

/**
 * FormData → plain object. Repeated keys (multi-selects, checkbox groups) become arrays and
 * files stay `File`s, so a zod schema can validate the whole submission.
 */
export function formDataToObject(
	formData: FormData
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
	const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
	for (const key of new Set(formData.keys())) {
		const values = formData.getAll(key);
		result[key] = values.length > 1 ? values : values[0];
	}
	return result;
}

/** The submitted text values, to refill the form after a failure. Never files or passwords. */
export function formValues(input: FormData | Record<string, unknown>): Record<string, string> {
	const entries = input instanceof FormData ? [...input.entries()] : Object.entries(input);
	return Object.fromEntries(
		entries.filter(
			(entry): entry is [string, string] =>
				typeof entry[1] === 'string' && !/password/i.test(entry[0])
		)
	);
}

export type ParsedForm<T> =
	| { success: true; data: T; values: Record<string, string> }
	| { success: false; errors: FieldErrors; values: Record<string, string> };

/**
 * Validates a form submission with messages in the admin's language. On failure, returns field
 * errors plus the submitted text values so the action can `fail(400, …)` (see `invalid()`) and
 * the page can refill the form.
 */
export function parseForm<Schema extends z.ZodType>(
	schema: Schema,
	formData: FormData
): ParsedForm<z.output<Schema>> {
	const input = formDataToObject(formData);
	const values = formValues(input);
	const result = schema.safeParse(input, { error: localizeIssue });
	if (result.success) return { success: true, data: result.data, values };
	return {
		success: false,
		errors: z.flattenError(result.error).fieldErrors as FieldErrors,
		values
	};
}

/**
 * The `fail(400)` every form action returns when the input is invalid: field errors, the values
 * to refill the form and an optional message for the whole form.
 */
export function invalid(errors: FieldErrors, values: Record<string, string>, message?: string) {
	return fail(400, { errors, values, message: message ?? null } satisfies FormFailure);
}

/** An HTML checkbox: present ("on") when ticked, absent otherwise. */
export const checkbox = z
	.string()
	.optional()
	.transform((value) => value === 'on' || value === 'true' || value === '1');
