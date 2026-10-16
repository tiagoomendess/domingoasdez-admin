<script lang="ts">
	import { Alert, Button } from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { PUBLIC_FRONTEND_URL } from '$app/env/public';
	import { can } from '#lib/auth/permissions.ts';
	import { agentTypeLabel } from '#lib/agent-types.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { slugify } from '#lib/slug.ts';
	import AgentForm from '../AgentForm.svelte';
	import HistoryCard from '../HistoryCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'team_agents.edit'));
	const canDelete = $derived(can(data.user.permissions, 'team_agents.create'));
	const publicUrl = $derived(
		`${PUBLIC_FRONTEND_URL}/tecnicos/${data.agent.id}/${slugify(data.agent.name)}`
	);
</script>

<PageHeader
	title={data.agent.name}
	back={resolve('/(app)/team-agents')}
	backLabel={m.nav_team_agents()}
>
	{#snippet actions()}
		<Button
			href={publicUrl}
			target="_blank"
			rel="noopener noreferrer"
			color="alternative"
			class="gap-2"
		>
			<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
			{m.players_open_public()}
		</Button>
		{#if canDelete}
			<DeleteButton title={m.team_agents_delete_title({ name: data.agent.name })}>
				{#if data.history.length}
					{m.team_agents_delete_history({ count: data.history.length })}
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	#{data.agent.id} · {agentTypeLabel(data.agent.agentType)} · {m.common_updated_at()}
	<DateTime value={data.agent.updatedAt} />
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<AgentForm
	agent={data.agent}
	team={data.team}
	player={data.player}
	picture={data.picture}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/team-agents')}
/>

<HistoryCard
	history={data.history}
	canEdit={data.canEditHistory}
	defaults={{ team: data.team, agentType: data.agent.agentType }}
	{form}
/>
