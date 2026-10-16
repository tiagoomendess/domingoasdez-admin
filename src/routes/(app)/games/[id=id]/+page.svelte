<script lang="ts">
	import { Alert, Badge, Button } from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import GameForm from '../GameForm.svelte';
	import GoalsCard from '../GoalsCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'games.edit'));
	const canDelete = $derived(can(data.user.permissions, 'games.create'));
	const summary = $derived(data.summary);
	const title = $derived(
		summary ? `${summary.homeClub} vs ${summary.awayClub}` : m.games_title_one({ id: data.game.id })
	);
	const score = (goals: number | null) => (goals === null ? '–' : goals);
</script>

<PageHeader {title} back={resolve('/(app)/games')} backLabel={m.nav_games()}>
	{#snippet actions()}
		{#if data.publicUrl}
			<Button
				href={data.publicUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.players_open_public()}
			</Button>
		{/if}
		{#if canDelete}
			<DeleteButton title={m.games_delete_title({ game: title })}>
				{#if data.usage && (data.usage.goals || data.usage.votes || data.usage.comments)}
					<p class="font-medium text-red-700 dark:text-red-400">
						{m.games_delete_usage(data.usage)}
					</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if summary}
	<!-- The scoreboard as the public site shows it. -->
	<div
		class="-mt-2 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center gap-3">
			<img src={summary.homeEmblem} alt="" class="size-10 object-contain" />
			<span>
				<span class="block font-medium text-gray-900 dark:text-white">{summary.homeClub}</span>
				<span class="block text-xs text-gray-500 dark:text-gray-400">{summary.homeTeam}</span>
			</span>
		</div>
		<span class="text-2xl font-bold text-gray-900 tabular-nums dark:text-white">
			{score(summary.goalsHome)} – {score(summary.goalsAway)}
			{#if summary.penaltiesHome !== null}
				<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
					({summary.penaltiesHome}–{summary.penaltiesAway}
					{m.games_penalties_short()})
				</span>
			{/if}
		</span>
		<div class="flex items-center gap-3">
			<img src={summary.awayEmblem} alt="" class="size-10 object-contain" />
			<span>
				<span class="block font-medium text-gray-900 dark:text-white">{summary.awayClub}</span>
				<span class="block text-xs text-gray-500 dark:text-gray-400">{summary.awayTeam}</span>
			</span>
		</div>
		<div class="ms-auto text-sm text-gray-600 dark:text-gray-400">
			<a
				href={resolve('/(app)/game-groups/[id=id]', { id: summary.groupId })}
				class="font-medium text-primary-700 hover:underline dark:text-primary-400"
				>{summary.groupLabel}</a
			>
			<span class="block">
				{m.games_round_short({ round: summary.round })} · <DateTime value={summary.date} />
			</span>
			<span class="mt-1 flex flex-wrap gap-1.5">
				{#if data.game.finished}<Badge color="green">{m.games_badge_finished()}</Badge>{/if}
				{#if data.game.postponed}<Badge color="yellow">{m.games_badge_postponed()}</Badge>{/if}
				{#if !data.game.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
				{#if data.game.generateImage}<Badge color="indigo">{m.games_badge_image_pending()}</Badge
					>{/if}
			</span>
		</div>
	</div>
{/if}

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

{#key data.game.id}
	<GameForm
		game={data.game}
		home={data.home}
		away={data.away}
		group={data.group}
		playground={data.playground}
		referees={data.referees}
		refereeTypes={data.refereeTypes}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/games')}
	/>
{/key}

{#if data.goals && summary}
	<GoalsCard
		gameId={data.game.id}
		goals={data.goals}
		homeClub={summary.homeClub}
		awayClub={summary.awayClub}
		canCreate={can(data.user.permissions, 'goals.create')}
	/>
{/if}
