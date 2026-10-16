<script lang="ts">
	import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { CloseOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { listHref } from '#lib/list.ts';
	import { resolvePath } from '#lib/paths.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { seasonLabel } from '#lib/seasons.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.nav_game_groups()}>
	{#snippet actions()}
		<CreateButton
			href={resolvePath(
				data.season ? `/game-groups/new?season=${data.season}` : '/game-groups/new'
			)}
			label={m.game_groups_new()}
			granted={data.user.permissions}
			permission="game_groups.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<ListSearch q={data.list.q} placeholder={m.game_groups_search_placeholder()} />
	{#if data.seasonFilter}
		<Badge color="blue" large class="gap-1.5">
			{data.seasonFilter.label}
			<a
				href={listHref(page.url, { season: null, page: null })}
				aria-label={m.game_groups_clear_season()}
				class="rounded-sm hover:text-blue-900 dark:hover:text-blue-200"
			>
				<CloseOutline class="size-3.5" aria-hidden="true" />
			</a>
		</Badge>
	{/if}
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.game_groups_empty()} />
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
			<SortHeader
				state={data.list}
				column="season"
				label={m.game_groups_season()}
				defaultDir="desc"
			/>
			<SortHeader
				state={data.list}
				column="games"
				label={m.game_groups_games()}
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
			{#each data.rows as group (group.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{group.id}</TableBodyCell
					>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/game-groups/[id=id]', { id: group.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{group.name || `#${group.id}`}
						</a>
						<span class="block text-xs text-gray-500 dark:text-gray-400">{group.rulesName}</span>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<span class="flex items-center gap-2">
							{#if group.competitionPicture}
								<img
									src={group.competitionPicture}
									alt=""
									class="size-6 object-contain"
									loading="lazy"
								/>
							{/if}
							<span>
								{group.competitionName}
								<span class="block text-xs text-gray-500 dark:text-gray-400">
									{seasonLabel({
										name: group.seasonName,
										startYear: group.startYear,
										endYear: group.endYear
									})}
								</span>
							</span>
						</span>
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{group.games}</TableBodyCell>
					<TableBodyCell><DateTime value={group.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
