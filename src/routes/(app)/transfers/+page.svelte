<script lang="ts">
	import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { ArrowRightOutline, CloseOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { formatDate } from '#lib/format.ts';
	import { listHref } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { resolvePath } from '#lib/paths.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const day = (date: Date | string) =>
		formatDate(new Date(date).toISOString().slice(0, 10), getLocale());
</script>

<PageHeader title={m.nav_transfers()}>
	{#snippet actions()}
		<CreateButton
			href={resolvePath(data.player ? `/transfers/new?player=${data.player}` : '/transfers/new')}
			label={m.transfers_new()}
			granted={data.user.permissions}
			permission="transfers.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap items-center gap-3">
	<ListSearch q={data.list.q} placeholder={m.transfers_search_placeholder()} />
	{#if data.playerFilter}
		<Badge color="blue" large class="gap-1.5">
			{data.playerFilter.label}
			<a
				href={listHref(page.url, { player: null, page: null })}
				aria-label={m.transfers_clear_player()}
				class="rounded-sm hover:text-blue-900 dark:hover:text-blue-200"
			>
				<CloseOutline class="size-3.5" aria-hidden="true" />
			</a>
		</Badge>
	{/if}
</div>

{#snippet team(entry: { label: string; emblem: string } | null)}
	{#if entry}
		<span class="flex items-center gap-2">
			<img src={entry.emblem} alt="" class="size-5 shrink-0 object-contain" loading="lazy" />
			<span>{entry.label}</span>
		</span>
	{:else}
		<span class="text-gray-500 italic dark:text-gray-400">{m.players_no_team()}</span>
	{/if}
{/snippet}

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.transfers_empty()} />
{:else}
	<Table hoverable shadow>
		<TableHead>
			<SortHeader
				state={data.list}
				column="date"
				label={m.transfers_date()}
				defaultDir="desc"
				class="w-32"
			/>
			<SortHeader state={data.list} column="player" label={m.transfers_player()} />
			<th class="px-6 py-3">{m.transfers_move()}</th>
			<th class="w-24 px-6 py-3"><span class="sr-only">{m.common_hidden()}</span></th>
		</TableHead>
		<TableBody>
			{#each data.rows as transfer (transfer.id)}
				<TableBodyRow>
					<TableBodyCell class="text-sm tabular-nums">
						<a
							href={resolve('/(app)/transfers/[id=id]', { id: transfer.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
							>{day(transfer.date)}</a
						>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={listHref(page.url, { player: String(transfer.playerId), page: null })}
							class="flex items-center gap-3 hover:text-primary-700 dark:hover:text-primary-400"
							title={m.transfers_filter_player()}
						>
							<img
								src={transfer.playerPicture}
								alt=""
								class="size-9 max-w-none min-w-9 rounded-full object-cover"
								loading="lazy"
							/>
							<span class="font-medium">{transfer.playerName}</span>
						</a>
					</TableBodyCell>
					<TableBodyCell class="text-sm whitespace-normal">
						<a
							href={resolve('/(app)/transfers/[id=id]', { id: transfer.id })}
							class="flex flex-wrap items-center gap-x-3 gap-y-1"
						>
							{#if transfer.first}
								<span class="text-xs text-gray-500 dark:text-gray-400">{m.transfers_first()}</span>
							{:else}
								{@render team(transfer.from)}
							{/if}
							<ArrowRightOutline class="size-4 text-gray-400" aria-hidden="true" />
							<span class="font-medium text-gray-900 dark:text-white"
								>{@render team(transfer.to)}</span
							>
						</a>
					</TableBodyCell>
					<TableBodyCell>
						{#if !transfer.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
