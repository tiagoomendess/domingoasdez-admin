<script lang="ts">
	import { Select } from 'flowbite-svelte';
	import FormField from './FormField.svelte';
	import { fieldState, getFormContext } from './context';

	let {
		name,
		label,
		value,
		options,
		hint,
		required = false,
		class: className = ''
	}: {
		name: string;
		label: string;
		/** Stored value. After a rejected submission the submitted one is selected instead. */
		value: string;
		/**
		 * A short, fixed list (an enum column). Related entities use `SearchSelect` instead.
		 */
		options: { value: string; label: string }[];
		hint?: string;
		required?: boolean;
		class?: string;
	} = $props();

	const context = getFormContext();
	const current = $derived(fieldState(context, name).submitted ?? value);
</script>

<FormField {name} {label} {hint} {required} class={className}>
	{#snippet children(field)}
		<Select
			id={field.id}
			{name}
			{required}
			value={current}
			placeholder=""
			color={field.invalid ? 'red' : 'default'}
			aria-invalid={field.invalid || undefined}
			aria-describedby={field.describedBy}
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</Select>
	{/snippet}
</FormField>
