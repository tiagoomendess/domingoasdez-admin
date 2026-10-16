<script lang="ts">
	import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { CloseOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { listHref } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOptions = [
		{ value: 'upcoming', label: m.games_status_upcoming() },
		{ value: 'played', label: m.games_status_played() },
		{ value: 'postponed', label: m.games_status_postponed() },
		{ value: 'hidden', label: m.games_status_hidden() }
	];
	const score = (goals: number | null) => (goals === null ? '–' : goals);
</script>

<PageHeader title={m.nav_games()}>
	{#snippet actions()}
		<CreateButton
			href={resolvePath(data.group ? `/games/new?group=${data.group}` : '/games/new')}
			label={m.games_new()}
			granted={data.user.permissions}
			permission="games.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<ListSearch q={data.list.q} placeholder={m.games_search_placeholder()} />
	<ListFilter
		name="status"
		value={data.status}
		label={m.games_status()}
		allLabel={m.games_status_all()}
		options={statusOptions}
		class="w-48"
	/>
	{#if data.groupFilter}
		<Badge color="blue" large class="gap-1.5">
			{data.groupFilter.label}
			<a
				href={listHref(page.url, { group: null, page: null })}
				aria-label={m.games_clear_group()}
				class="rounded-sm hover:text-blue-900 dark:hover:text-blue-200"
			>
				<CloseOutline class="size-3.5" aria-hidden="true" />
			</a>
		</Badge>
	{/if}
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.games_empty()} />
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
			<SortHeader
				state={data.list}
				column="date"
				label={m.games_date()}
				defaultDir="desc"
				class="w-40"
			/>
			<th class="px-6 py-3">{m.games_game()}</th>
			<SortHeader
				state={data.list}
				column="round"
				label={m.games_round()}
				defaultDir="desc"
				class="w-24"
			/>
			<th class="px-6 py-3">{m.games_group()}</th>
		</TableHead>
		<TableBody>
			{#each data.rows as game (game.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{game.id}</TableBodyCell
					>
					<TableBodyCell class="text-sm"><DateTime value={game.date} /></TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/games/[id=id]', { id: game.id })}
							class="group grid grid-cols-[1fr_auto_1fr] items-center gap-3"
						>
							<span class="flex items-center justify-end gap-2 text-right">
								<span
									class="font-medium text-gray-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-400"
									>{game.homeClub}</span
								>
								<img src={game.homeEmblem} alt="" class="size-6 object-contain" loading="lazy" />
							</span>
							<span
								class="rounded-sm bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-900 tabular-nums dark:bg-gray-700 dark:text-white"
							>
								{score(game.goalsHome)} – {score(game.goalsAway)}
							</span>
							<span class="flex items-center gap-2">
								<img src={game.awayEmblem} alt="" class="size-6 object-contain" loading="lazy" />
								<span
									class="font-medium text-gray-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-400"
									>{game.awayClub}</span
								>
							</span>
						</a>
						<span class="mt-1 flex flex-wrap justify-center gap-1.5">
							{#if game.finished}<Badge color="green">{m.games_badge_finished()}</Badge>{/if}
							{#if game.postponed}<Badge color="yellow">{m.games_badge_postponed()}</Badge>{/if}
							{#if !game.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
						</span>
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{game.round}</TableBodyCell>
					<TableBodyCell class="text-xs whitespace-normal text-gray-600 dark:text-gray-400">
						<a
							href={listHref(page.url, { group: String(game.groupId), page: null })}
							class="hover:text-primary-700 hover:underline dark:hover:text-primary-400"
							title={m.games_filter_group()}>{game.groupLabel}</a
						>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
