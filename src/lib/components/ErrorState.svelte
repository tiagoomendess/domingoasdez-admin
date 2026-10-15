<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	const title = $derived(
		page.status === 404
			? m.error_not_found()
			: page.status === 403
				? m.error_forbidden()
				: m.error_generic()
	);
</script>

<svelte:head>
	<title>{page.status} · {m.app_name()}</title>
</svelte:head>

<section class="mx-auto flex max-w-md flex-col items-center py-16 text-center">
	<p class="text-7xl font-extralight text-primary-700 dark:text-primary-400">{page.status}</p>
	<h1 class="mt-4 text-xl font-medium text-gray-900 dark:text-white">{title}</h1>
	{#if page.error?.errorId}
		<p class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">{page.error.errorId}</p>
	{/if}
	<Button href={resolve('/(app)')} class="mt-8">{m.error_back_home()}</Button>
</section>
