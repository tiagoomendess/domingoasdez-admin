<script lang="ts">
	import { TableHeadCell } from 'flowbite-svelte';
	import { ArrowDownOutline, ArrowUpOutline, ArrowSortLettersOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/state';
	import { sortHref, type ListState, type SortDirection } from '#lib/list.ts';

	let {
		state,
		column,
		label,
		defaultDir = 'asc',
		class: className = ''
	}: {
		state: Pick<ListState, 'sort' | 'dir'>;
		/** Sort key accepted by the page `load` (`?sort=`). */
		column: string;
		label: string;
		/** First click direction: `desc` suits dates and ids (newest first). */
		defaultDir?: SortDirection;
		class?: string;
	} = $props();

	const active = $derived(state.sort === column);
</script>

<TableHeadCell
	class={className}
	aria-sort={active ? (state.dir === 'asc' ? 'ascending' : 'descending') : undefined}
>
	<a
		href={sortHref(page.url, state, column, defaultDir)}
		class={[
			'group inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white',
			active && 'text-gray-900 dark:text-white'
		]}
		data-sveltekit-reset="false"
		data-sveltekit-replacestate
	>
		{label}
		{#if active && state.dir === 'asc'}
			<ArrowUpOutline class="size-3.5" aria-hidden="true" />
		{:else if active}
			<ArrowDownOutline class="size-3.5" aria-hidden="true" />
		{:else}
			<ArrowSortLettersOutline
				class="size-3.5 opacity-0 transition-opacity group-hover:opacity-60"
				aria-hidden="true"
			/>
		{/if}
	</a>
</TableHeadCell>
