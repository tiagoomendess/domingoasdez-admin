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
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.nav_goals()}>
	{#snippet actions()}
		<CreateButton
			href={resolvePath(data.game ? `/goals/new?game=${data.game}` : '/goals/new')}
			label={m.goals_new()}
			granted={data.user.permissions}
			permission="goals.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<ListSearch q={data.list.q} placeholder={m.goals_search_placeholder()} />
	{#if data.gameFilter}
		<Badge color="blue" large class="gap-1.5">
			{data.gameFilter.label}
			<a
				href={listHref(page.url, { game: null, page: null })}
				aria-label={m.goals_clear_game()}
				class="rounded-sm hover:text-blue-900 dark:hover:text-blue-200"
			>
				<CloseOutline class="size-3.5" aria-hidden="true" />
			</a>
		</Badge>
	{/if}
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.goals_empty()} />
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
			<th class="px-6 py-3">{m.goals_player()}</th>
			<SortHeader state={data.list} column="minute" label={m.goals_minute()} class="w-24" />
			<SortHeader state={data.list} column="game" label={m.goals_game()} defaultDir="desc" />
		</TableHead>
		<TableBody>
			{#each data.rows as goal (goal.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{goal.id}</TableBodyCell
					>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/goals/[id=id]', { id: goal.id })}
							class="flex items-center gap-3"
						>
							<img
								src={goal.playerPicture}
								alt=""
								class="size-9 max-w-none min-w-9 rounded-full object-cover"
								loading="lazy"
							/>
							<span>
								<span
									class="block font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
								>
									{goal.playerName ?? m.goals_unknown_player()}
								</span>
								<span class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
									<img src={goal.scoringEmblem} alt="" class="size-4 object-contain" />
									{goal.scoringClub}
								</span>
							</span>
						</a>
						<span class="mt-1 flex flex-wrap gap-1.5">
							{#if goal.ownGoal}<Badge color="red">{m.goals_badge_own_goal()}</Badge>{/if}
							{#if goal.penalty}<Badge color="indigo">{m.goals_badge_penalty()}</Badge>{/if}
							{#if !goal.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
						</span>
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{goal.minute ? `${goal.minute}'` : '—'}</TableBodyCell
					>
					<TableBodyCell class="whitespace-normal">
						<a
							href={listHref(page.url, { game: String(goal.gameId), page: null })}
							class="text-sm text-gray-700 hover:text-primary-700 hover:underline dark:text-gray-300 dark:hover:text-primary-400"
							title={m.goals_filter_game()}>{goal.homeClub} vs {goal.awayClub}</a
						>
						<span class="block text-xs text-gray-500 dark:text-gray-400"
							><DateTime value={goal.gameDate} /></span
						>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
