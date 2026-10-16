<script lang="ts">
	import { Input } from 'flowbite-svelte';
	import type { FullAutoFill } from 'svelte/elements';
	import { fieldState, getFormContext } from './context';
	import FormField from './FormField.svelte';

	let {
		name,
		label,
		value = '',
		type = 'text',
		hint,
		required = false,
		maxlength,
		min,
		max,
		step,
		placeholder,
		autocomplete,
		list,
		class: className = ''
	}: {
		name: string;
		label: string;
		/** Stored value. After a rejected submission the submitted text is shown instead. */
		value?: string | number | null;
		type?: 'text' | 'email' | 'url' | 'number' | 'date' | 'datetime-local' | 'tel';
		hint?: string;
		required?: boolean;
		maxlength?: number;
		min?: number | string;
		max?: number | string;
		step?: number;
		placeholder?: string;
		autocomplete?: FullAutoFill;
		/** Id of a `<datalist>` of suggestions. */
		list?: string;
		class?: string;
	} = $props();

	const context = getFormContext();
	const current = $derived(fieldState(context, name).submitted ?? String(value ?? ''));
</script>

<FormField {name} {label} {hint} {required} class={className}>
	{#snippet children(field)}
		<Input
			id={field.id}
			{name}
			{type}
			{required}
			{maxlength}
			{min}
			{max}
			{step}
			{placeholder}
			{autocomplete}
			{list}
			value={current}
			color={field.invalid ? 'red' : 'default'}
			aria-invalid={field.invalid || undefined}
			aria-describedby={field.describedBy}
		/>
	{/snippet}
</FormField>
