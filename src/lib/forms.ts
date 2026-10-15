/** Shapes shared by form actions (`#lib/server/forms.ts`) and the form components. */

export type FieldErrors = Record<string, string[] | undefined>;

/** What `invalid()` returns to the page as `form` when a submission is rejected. */
export type FormFailure = {
	errors: FieldErrors;
	values: Record<string, string>;
	message: string | null;
};

/** Narrows an action's `form` prop to a validation failure. */
export function isFormFailure(form: unknown): form is FormFailure {
	return typeof form === 'object' && form !== null && 'errors' in form && 'values' in form;
}
