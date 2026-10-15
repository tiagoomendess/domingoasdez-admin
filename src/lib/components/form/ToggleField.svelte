<script lang="ts">
	import { Helper, Toggle } from 'flowbite-svelte';
	import { fieldIds, getFormContext } from './context';

	let {
		name,
		label,
		checked = false,
		hint,
		class: className = ''
	}: {
		name: string;
		label: string;
		/** Stored value. After a rejected submission the submitted state is shown instead. */
		checked?: boolean;
		hint?: string;
		class?: string;
	} = $props();

	const context = getFormContext();
	// An unticked checkbox is not submitted, so after a failure "absent" means off.
	const current = $derived(
		context?.failure ? context.failure.values[name] !== undefined : Boolean(checked)
	);
	const { id } = $derived(fieldIds(name));
</script>

<div class={className}>
	<Toggle {id} {name} checked={current} aria-describedby={hint ? `${id}-hint` : undefined}>
		{label}
	</Toggle>
	{#if hint}
		<Helper id="{id}-hint" class="mt-1 ps-14">{hint}</Helper>
	{/if}
</div>
