<script lang="ts">
	import { Textarea } from 'flowbite-svelte';
	import FormField from './FormField.svelte';
	import { fieldState, getFormContext } from './context';

	let {
		name,
		label,
		value = '',
		hint,
		required = false,
		maxlength,
		rows = 3,
		placeholder,
		class: className = ''
	}: {
		name: string;
		label: string;
		/** Stored value. After a rejected submission the submitted text is shown instead. */
		value?: string | null;
		hint?: string;
		required?: boolean;
		maxlength?: number;
		rows?: number;
		placeholder?: string;
		class?: string;
	} = $props();

	const context = getFormContext();
	const current = $derived(fieldState(context, name).submitted ?? value ?? '');
</script>

<FormField {name} {label} {hint} {required} class={className}>
	{#snippet children(field)}
		<Textarea
			id={field.id}
			{name}
			{required}
			{maxlength}
			{rows}
			{placeholder}
			value={current}
			class={['w-full', field.invalid && 'border-red-500 dark:border-red-500']}
			aria-invalid={field.invalid || undefined}
			aria-describedby={field.describedBy}
		/>
	{/snippet}
</FormField>
