<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { m } from '#lib/paraglide/messages.js';

	let {
		title,
		back,
		backLabel,
		actions
	}: {
		title: string;
		/** Parent list, shown as a "back" link above the title. */
		back?: ResolvedPathname;
		backLabel?: string;
		/** Buttons on the right (e.g. "New club"). */
		actions?: Snippet;
	} = $props();
</script>

<svelte:head>
	<title>{title} · {m.app_name()}</title>
</svelte:head>

<header class="mb-6">
	{#if back}
		<a
			href={back}
			class="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 dark:text-gray-400 dark:hover:text-primary-400"
		>
			<ArrowLeftOutline class="size-4" aria-hidden="true" />
			{backLabel ?? m.common_back()}
		</a>
	{/if}
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-3xl font-light">{title}</Heading>
		{#if actions}
			<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
		{/if}
	</div>
</header>
