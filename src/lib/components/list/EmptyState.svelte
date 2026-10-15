<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { FileSearchOutline, InboxOutline } from 'flowbite-svelte-icons';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { listHref } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';

	let {
		q = '',
		message,
		actions
	}: {
		/** The current search: when set, the empty state offers to clear it. */
		q?: string;
		/** Shown when nothing exists yet (no search). */
		message: string;
		actions?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-col items-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-800"
>
	{#if q}
		<FileSearchOutline class="mb-3 size-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
		<p class="text-gray-700 dark:text-gray-300">{m.list_no_results({ q })}</p>
		<Button
			href={listHref(page.url, { q: null, page: null })}
			color="alternative"
			size="sm"
			class="mt-4"
		>
			{m.list_search_clear()}
		</Button>
	{:else}
		<InboxOutline class="mb-3 size-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
		<p class="text-gray-700 dark:text-gray-300">{message}</p>
		{#if actions}
			<div class="mt-4">{@render actions()}</div>
		{/if}
	{/if}
</div>
