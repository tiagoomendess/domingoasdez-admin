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
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { seasonYears } from '#lib/seasons.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.nav_seasons()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/seasons/new')}
			label={m.seasons_new()}
			granted={data.user.permissions}
			permission="seasons.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.seasons_search_placeholder()} />
	<ListFilter
		name="competition"
		value={data.competition ? String(data.competition) : null}
		label={m.seasons_competition()}
		allLabel={m.seasons_all_competitions()}
		options={data.competitionOptions}
		class="w-60"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.seasons_empty()} />
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
			<SortHeader state={data.list} column="competition" label={m.seasons_competition()} />
			<SortHeader
				state={data.list}
				column="years"
				label={m.seasons_years()}
				defaultDir="desc"
				class="w-40"
			/>
			<TableHeadCell>{m.seasons_display_name()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="groups"
				label={m.nav_game_groups()}
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
			{#each data.rows as season (season.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{season.id}</TableBodyCell
					>
					<TableBodyCell class="whitespace-normal">
						<span class="flex items-center gap-2">
							{#if season.competitionPicture}
								<img
									src={season.competitionPicture}
									alt=""
									class="size-6 object-contain"
									loading="lazy"
								/>
							{/if}
							{season.competitionName}
						</span>
					</TableBodyCell>
					<TableBodyCell>
						<a
							href={resolve('/(app)/seasons/[id=id]', { id: season.id })}
							class="font-medium text-gray-900 tabular-nums hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{seasonYears(season.startYear, season.endYear)}
						</a>
						{#if !season.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal text-gray-600 dark:text-gray-400"
						>{season.name ?? '—'}</TableBodyCell
					>
					<TableBodyCell class="tabular-nums">{season.groups}</TableBodyCell>
					<TableBodyCell><DateTime value={season.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
