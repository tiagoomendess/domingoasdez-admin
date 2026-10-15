<script lang="ts">
	import { Card, Heading, P } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.dashboard_title()} · {m.app_name()}</title>
</svelte:head>

<Heading tag="h1" class="mb-1 text-3xl font-light">{m.dashboard_title()}</Heading>
<P class="mb-6 text-gray-500 dark:text-gray-400">{m.dashboard_welcome({ name: data.user.name })}</P>

<Card size="xl" class="p-6">
	<P>{m.dashboard_placeholder()}</P>
</Card>
