<script lang="ts">
	import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.teams_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/teams/new')}
			label={m.teams_new()}
			granted={data.user.permissions}
			permission="teams.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.teams_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.teams_empty()} />
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
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader state={data.list} column="club" label={m.teams_club()} />
			<SortHeader
				state={data.list}
				column="updated_at"
				label={m.common_updated_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as team (team.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{team.id}</TableBodyCell
					>
					<TableBodyCell>
						<a
							href={resolve('/(app)/teams/[id=id]', { id: team.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{team.name}
						</a>
						{#if !team.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						<span class="flex items-center gap-2">
							<img src={team.clubEmblem} alt="" class="size-6 object-contain" loading="lazy" />
							{team.clubName}
						</span>
					</TableBodyCell>
					<TableBodyCell><DateTime value={team.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
