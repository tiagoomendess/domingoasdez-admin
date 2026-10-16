<script lang="ts">
	import {
		Badge,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { agentTypeLabel, agentTypeOptions } from '#lib/agent-types.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.nav_team_agents()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/team-agents/new')}
			label={m.team_agents_new()}
			granted={data.user.permissions}
			permission="team_agents.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.team_agents_search_placeholder()} />
	<ListFilter
		name="type"
		value={data.type}
		label={m.team_agents_type()}
		allLabel={m.team_agents_type_all()}
		options={agentTypeOptions()}
		class="w-56"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.team_agents_empty()} />
{:else}
	<Table hoverable shadow>
		<TableHead>
			<SortHeader
				state={data.list}
				column="id"
				label={m.common_id()}
				defaultDir="desc"
				class="w-20"
			/>
			<TableHeadCell class="w-16"><span class="sr-only">{m.players_picture()}</span></TableHeadCell>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader state={data.list} column="agent_type" label={m.team_agents_type()} class="w-52" />
			<SortHeader
				state={data.list}
				column="club"
				label={m.team_agents_current_team()}
				class="w-64"
			/>
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.common_created_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as agent (agent.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{agent.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<img
							src={agent.picture}
							alt=""
							class="size-10 max-w-none min-w-10 rounded-full object-cover"
							loading="lazy"
						/>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/team-agents/[id=id]', { id: agent.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{agent.name}
						</a>
						{#if agent.playerId}
							<Badge color="indigo" class="ms-2">{m.team_agents_is_player()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="text-gray-600 dark:text-gray-400">
						{agentTypeLabel(agent.agentType)}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if agent.clubName}
							<span class="flex items-center gap-2">
								<img
									src={agent.clubEmblem}
									alt=""
									class="size-6 shrink-0 object-contain"
									loading="lazy"
								/>
								<span>
									{agent.clubName}
									<span class="block text-xs text-gray-500 dark:text-gray-400"
										>{agent.teamName}</span
									>
								</span>
							</span>
						{:else}
							<span class="text-gray-400 italic">{m.team_agents_no_team()}</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell><DateTime value={agent.createdAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
