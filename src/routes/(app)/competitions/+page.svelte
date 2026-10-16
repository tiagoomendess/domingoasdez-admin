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
	import { AwardOutline } from 'flowbite-svelte-icons';
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

<PageHeader title={m.nav_competitions()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/competitions/new')}
			label={m.competitions_new()}
			granted={data.user.permissions}
			permission="competitions.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.competitions_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.competitions_empty()} />
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
			<TableHeadCell class="w-16"
				><span class="sr-only">{m.competitions_picture()}</span></TableHeadCell
			>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader
				state={data.list}
				column="priority"
				label={m.competitions_priority()}
				defaultDir="desc"
				class="w-28"
			/>
			<SortHeader
				state={data.list}
				column="seasons"
				label={m.nav_seasons()}
				defaultDir="desc"
				class="w-28"
			/>
			<TableHeadCell class="w-40">{m.competitions_social_media()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="updated_at"
				label={m.common_updated_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as competition (competition.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{competition.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						{#if competition.picture}
							<img
								src={competition.picture}
								alt=""
								class="size-10 max-w-none object-contain"
								loading="lazy"
							/>
						{:else}
							<AwardOutline class="size-8 text-gray-300" aria-hidden="true" />
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/competitions/[id=id]', { id: competition.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{competition.name}
						</a>
						{#if !competition.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{competition.priority}</TableBodyCell>
					<TableBodyCell class="tabular-nums">{competition.seasons}</TableBodyCell>
					<TableBodyCell>
						{competition.socialMediaEnabled ? m.common_yes() : m.common_no()}
					</TableBodyCell>
					<TableBodyCell><DateTime value={competition.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
