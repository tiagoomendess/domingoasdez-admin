<script lang="ts">
	import { Alert, Button } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import GoalForm from '../GoalForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'goals.edit'));
	const canCreate = $derived(can(data.user.permissions, 'goals.create'));
	const summary = $derived(data.summary);
	const scorer = $derived(summary.playerName ?? m.goals_unknown_player());
</script>

<PageHeader
	title={m.goals_title_one({ id: data.goal.id })}
	back={resolve('/(app)/goals')}
	backLabel={m.nav_goals()}
>
	{#snippet actions()}
		{#if canCreate}
			<!-- Goals of a game are usually added one after the other. -->
			<Button
				href={resolvePath(`/goals/new?game=${summary.gameId}&side=${summary.side}`)}
				color="alternative"
				class="gap-2"
			>
				<PlusOutline class="size-4" aria-hidden="true" />
				{m.goals_another()}
			</Button>
			<DeleteButton title={m.goals_delete_title({ id: data.goal.id })} />
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	<a
		href={resolve('/(app)/games/[id=id]', { id: summary.gameId })}
		class="font-medium text-primary-700 hover:underline dark:text-primary-400"
		>{summary.homeClub} vs {summary.awayClub}</a
	>
	· {scorer}{summary.minute ? ` ${summary.minute}'` : ''} ({summary.scoringClub})
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

{#key data.goal.id}
	<GoalForm
		goal={{
			side: summary.side,
			minute: data.goal.minute,
			penalty: data.goal.penalty,
			ownGoal: data.goal.ownGoal,
			visible: data.goal.visible
		}}
		game={data.game}
		player={data.player}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/goals')}
	/>
{/key}
