<script lang="ts">
	import { Input } from 'flowbite-svelte';
	import { CloseOutline, SearchOutline } from 'flowbite-svelte-icons';
	import { onDestroy, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { listHref } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';

	let {
		q,
		placeholder = m.list_search_placeholder(),
		label = m.list_search_label()
	}: {
		/** The search currently applied (`ListState.q`). */
		q: string;
		placeholder?: string;
		label?: string;
	} = $props();

	/** Same delay as the searchable selects. */
	const DEBOUNCE_MS = 300;

	let text = $state(untrack(() => q));
	let input = $state<HTMLInputElement>();
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Follow the URL (back/forward, links), but never overwrite what the admin is still typing.
	let applied = untrack(() => q);
	$effect.pre(() => {
		if (q === applied) return;
		applied = q;
		if (document.activeElement !== input) text = q;
	});

	// Other query parameters (sort, filters) survive a search made without JavaScript.
	const kept = $derived(
		[...page.url.searchParams].filter(([key]) => key !== 'q' && key !== 'page')
	);

	function search(value: string) {
		clearTimeout(timer);
		const next = value.trim();
		if (next === applied) return;
		applied = next;
		// Keep the focus in the box and the scroll position while typing.
		goto(listHref(page.url, { q: next, page: null }), { replace: true, reset: false });
	}

	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(() => search(text), DEBOUNCE_MS);
	}

	function clear() {
		text = '';
		search('');
		input?.focus();
	}

	onDestroy(() => clearTimeout(timer));
</script>

<form
	method="GET"
	role="search"
	class="w-full sm:max-w-sm"
	onsubmit={(event) => {
		event.preventDefault();
		search(text);
	}}
>
	{#each kept as [key, value] (key)}
		<input type="hidden" name={key} {value} />
	{/each}
	<Input
		bind:elementRef={input}
		bind:value={text}
		{oninput}
		type="search"
		name="q"
		{placeholder}
		aria-label={label}
		autocomplete="off"
		maxlength={100}
		class="ps-10 pe-9 [&::-webkit-search-cancel-button]:hidden"
	>
		{#snippet left()}
			<SearchOutline class="size-4" aria-hidden="true" />
		{/snippet}
		{#snippet right()}
			{#if text}
				<button
					type="button"
					class="rounded p-0.5 hover:text-gray-900 dark:hover:text-white"
					aria-label={m.list_search_clear()}
					onclick={clear}
				>
					<CloseOutline class="size-4" aria-hidden="true" />
				</button>
			{/if}
		{/snippet}
	</Input>
</form>
