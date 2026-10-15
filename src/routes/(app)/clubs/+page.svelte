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

<PageHeader title={m.clubs_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/clubs/new')}
			label={m.clubs_new()}
			granted={data.user.permissions}
			permission="clubs.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.clubs_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.clubs_empty()} />
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
			<TableHeadCell class="w-16"><span class="sr-only">{m.clubs_emblem()}</span></TableHeadCell>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader
				state={data.list}
				column="teams"
				label={m.clubs_teams()}
				defaultDir="desc"
				class="w-28"
			/>
			<SortHeader
				state={data.list}
				column="priority"
				label={m.clubs_priority()}
				defaultDir="desc"
				class="w-28"
			/>
			<SortHeader
				state={data.list}
				column="updated_at"
				label={m.common_updated_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as club (club.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{club.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<img src={club.emblem} alt="" class="size-9 object-contain" loading="lazy" />
					</TableBodyCell>
					<TableBodyCell>
						<a
							href={resolve('/(app)/clubs/[id=id]', { id: club.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{club.name}
						</a>
						{#if !club.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{club.teams}</TableBodyCell>
					<TableBodyCell class="tabular-nums">{club.priority}</TableBodyCell>
					<TableBodyCell><DateTime value={club.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
