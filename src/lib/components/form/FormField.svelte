<script lang="ts">
	import { Helper, Label } from 'flowbite-svelte';
	import type { Snippet } from 'svelte';
	import { fieldIds, fieldState, getFormContext } from './context';

	export type FieldProps = {
		id: string;
		invalid: boolean;
		/** Ids of the hint and error text, for `aria-describedby`. */
		describedBy: string | undefined;
	};

	let {
		name,
		label,
		hint,
		required = false,
		errors: ownErrors,
		class: className = '',
		children
	}: {
		/** Form field name: errors come from the last failed submission (`EntityForm`). */
		name: string;
		label: string;
		hint?: string;
		/** Adds the "required" marker to the label (the control enforces it). */
		required?: boolean;
		/** Errors to show instead of the form's (outside `EntityForm`). */
		errors?: string[];
		class?: string;
		children: Snippet<[FieldProps]>;
	} = $props();

	const context = getFormContext();
	const errors = $derived(ownErrors ?? fieldState(context, name).errors);
	const { id, errorId } = $derived(fieldIds(name));
	const hintId = $derived(`${id}-hint`);
	const describedBy = $derived(
		[hint ? hintId : null, errors.length ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={className}>
	<Label for={id} color={errors.length ? 'red' : undefined} class="mb-2">
		{label}
		{#if required}<span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span>{/if}
	</Label>
	{@render children({ id, invalid: errors.length > 0, describedBy })}
	{#if hint}
		<Helper id={hintId} class="mt-1.5">{hint}</Helper>
	{/if}
	{#if errors.length}
		<Helper id={errorId} color="red" class="mt-1.5">
			{#each errors as error (error)}
				<span class="block">{error}</span>
			{/each}
		</Helper>
	{/if}
</div>
