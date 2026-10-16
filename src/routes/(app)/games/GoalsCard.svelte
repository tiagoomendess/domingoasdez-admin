<script lang="ts">
	import { Badge, Button, Card, Heading } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';

	type Goal = {
		id: number;
		minute: number | null;
		penalty: boolean;
		ownGoal: boolean;
		visible: boolean;
		side: 'home' | 'away';
		playerName: string | null;
	};

	let {
		gameId,
		goals,
		homeClub,
		awayClub,
		canCreate
	}: {
		gameId: number;
		goals: Goal[];
		homeClub: string;
		awayClub: string;
		canCreate: boolean;
	} = $props();

	const sides = $derived([
		{ side: 'home' as const, club: homeClub, goals: goals.filter((goal) => goal.side === 'home') },
		{ side: 'away' as const, club: awayClub, goals: goals.filter((goal) => goal.side === 'away') }
	]);
</script>

<!-- The goals recorded for the game: the site counts them when the score fields are empty. -->
<Card size="xl" class="mt-6 p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h2" class="text-lg font-medium">{m.nav_goals()}</Heading>
		<a
			href={resolvePath(`/goals?game=${gameId}`)}
			class="text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
			>{m.goals_see_all()}</a
		>
	</div>
	<div class="grid gap-6 md:grid-cols-2">
		{#each sides as column (column.side)}
			<div>
				<div class="mb-2 flex items-center justify-between gap-2">
					<span class="font-medium text-gray-900 dark:text-white">
						{column.club}
						<span class="ms-1 text-sm text-gray-500 tabular-nums dark:text-gray-400"
							>({column.goals.length})</span
						>
					</span>
					{#if canCreate}
						<Button
							size="xs"
							color="alternative"
							class="gap-1.5"
							href={resolvePath(`/goals/new?game=${gameId}&side=${column.side}`)}
						>
							<PlusOutline class="size-3.5" aria-hidden="true" />
							{m.goals_add()}
						</Button>
					{/if}
				</div>
				{#if column.goals.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400">{m.goals_none()}</p>
				{:else}
					<ul class="divide-y divide-gray-100 dark:divide-gray-700">
						{#each column.goals as goal (goal.id)}
							<li class="flex items-center gap-2 py-1.5 text-sm">
								<span class="w-10 text-gray-500 tabular-nums dark:text-gray-400"
									>{goal.minute ? `${goal.minute}'` : '—'}</span
								>
								<a
									href={resolve('/(app)/goals/[id=id]', { id: goal.id })}
									class="text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
									>{goal.playerName ?? m.goals_unknown_player()}</a
								>
								{#if goal.ownGoal}<Badge color="red">{m.goals_badge_own_goal()}</Badge>{/if}
								{#if goal.penalty}<Badge color="indigo">{m.goals_badge_penalty()}</Badge>{/if}
								{#if !goal.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</div>
</Card>
