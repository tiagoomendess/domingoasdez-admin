import { getContext, setContext } from 'svelte';
import type { FormFailure } from '#lib/forms.ts';

/**
 * `EntityForm` shares the last failed submission with its fields, so each field shows its own
 * errors and refills the submitted value by `name` without the page wiring it by hand.
 */
export type FormContext = {
	readonly failure: FormFailure | null;
	readonly readonly: boolean;
};

const KEY = Symbol('entity-form');

export function setFormContext(context: FormContext) {
	setContext(KEY, context);
}

export function getFormContext(): FormContext | undefined {
	return getContext<FormContext | undefined>(KEY);
}

/** Field errors and refill value for `name` (the stored value when the form was not rejected). */
export function fieldState(context: FormContext | undefined, name: string) {
	const failure = context?.failure ?? null;
	return {
		errors: failure?.errors[name] ?? [],
		/** `undefined` when there is no failed submission to refill from. */
		submitted: failure ? (failure.values[name] ?? '') : undefined
	};
}

export const fieldIds = (name: string) => ({ id: `field-${name}`, errorId: `field-${name}-error` });
