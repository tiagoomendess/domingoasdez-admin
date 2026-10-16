<script lang="ts">
	import { Badge, Card, Heading } from 'flowbite-svelte';
	import { ArrowRightOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { formatDate } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	type Entry = {
		id: number;
		date: Date | string;
		visible: boolean;
		team: { label: string; emblem: string } | null;
	};

	let {
		timeline,
		currentId = null,
		player
	}: {
		/** Oldest first. */
		timeline: Entry[];
		/** The transfer being edited, highlighted. */
		currentId?: number | null;
		player: { name: string; picture: string; team: { label: string; emblem: string } | null };
	} = $props();

	// Newest first, as people read a career; the latest decides the player's current team.
	const entries = $derived([...timeline].reverse());
	const day = (date: Date | string) =>
		formatDate(new Date(date).toISOString().slice(0, 10), getLocale());
</script>

<Card size="xl" class="p-6">
	<div class="mb-4 flex items-center gap-3">
		<img src={player.picture} alt="" class="size-10 rounded-full object-cover" />
		<div>
			<Heading tag="h2" class="text-lg font-medium">{m.transfers_history()}</Heading>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{player.name} · {m.transfers_current_team()}: {player.team?.label ?? m.players_no_team()}
			</p>
		</div>
	</div>
	{#if entries.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.players_transfers_empty()}</p>
	{:else}
		<ol class="relative ms-2 border-s border-gray-200 dark:border-gray-700">
			{#each entries as entry, index (entry.id)}
				{@const current = entry.id === currentId}
				<li class="ms-5 pb-4 last:pb-0">
					<span
						class={[
							'absolute -start-1.5 mt-1.5 size-3 rounded-full border border-white dark:border-gray-800',
							current
								? 'bg-primary-600'
								: index === 0
									? 'bg-gray-500'
									: 'bg-gray-300 dark:bg-gray-600'
						]}
					></span>
					<a
						href={resolve('/(app)/transfers/[id=id]', { id: entry.id })}
						class={[
							'-ms-2 block rounded-lg px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700',
							current && 'bg-primary-50 dark:bg-primary-900/20'
						]}
					>
						<time class="text-xs text-gray-500 dark:text-gray-400">{day(entry.date)}</time>
						<span class="flex flex-wrap items-center gap-2 text-sm text-gray-900 dark:text-white">
							<ArrowRightOutline class="size-3.5 text-gray-400" aria-hidden="true" />
							{#if entry.team}
								<img src={entry.team.emblem} alt="" class="size-5 object-contain" />
								<span class="font-medium">{entry.team.label}</span>
							{:else}
								<span class="text-gray-500 italic dark:text-gray-400">{m.players_no_team()}</span>
							{/if}
							{#if index === 0}<Badge color="green">{m.transfers_latest()}</Badge>{/if}
							{#if !entry.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ol>
	{/if}
</Card>
