<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import Timeline from '../Timeline.svelte';
	import TransferForm from '../TransferForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Load the picked player's history (the page reads `?player=`). */
	function showPlayer(option: { value: number | string } | null) {
		const path = option ? `/transfers/new?player=${option.value}` : '/transfers/new';
		goto(resolvePath(path), { replaceState: true });
	}
</script>

<PageHeader
	title={m.transfers_new()}
	back={resolve('/(app)/transfers')}
	backLabel={m.nav_transfers()}
/>

<div class="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
	<div class="min-w-0">
		<TransferForm
			player={data.player}
			team={null}
			date={data.today}
			visible
			onplayerchange={showPlayer}
			{form}
			cancelHref={resolve('/(app)/transfers')}
			submitLabel={m.form_create()}
		/>
	</div>
	{#if data.summary}
		<Timeline timeline={data.timeline} player={data.summary} />
	{:else}
		<Card size="xl" class="p-6">
			<p class="text-sm text-gray-500 dark:text-gray-400">{m.transfers_pick_player()}</p>
		</Card>
	{/if}
</div>
