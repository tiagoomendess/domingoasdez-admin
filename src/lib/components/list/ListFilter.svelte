<script lang="ts">
	import { Select } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { listHref } from '#lib/list.ts';

	let {
		name,
		value,
		label,
		allLabel,
		options,
		class: className = ''
	}: {
		/** Query parameter, e.g. `type`. */
		name: string;
		/** The filter currently applied (from the page `load`). */
		value: string | null;
		/** Accessible name of the select. */
		label: string;
		/** First option, which clears the filter. */
		allLabel: string;
		options: { value: string; label: string }[];
		class?: string;
	} = $props();

	function apply(next: string) {
		// A new filter starts again from the first page.
		goto(listHref(page.url, { [name]: next || null, page: null }));
	}
</script>

<Select
	aria-label={label}
	value={value ?? ''}
	class={className}
	placeholder=""
	onchange={(event) => apply((event.currentTarget as HTMLSelectElement).value)}
>
	<option value="">{allLabel}</option>
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</Select>
