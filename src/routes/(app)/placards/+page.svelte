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
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.placards_title()} />

<p class="mb-4 max-w-3xl text-sm text-gray-500 dark:text-gray-400">{m.placards_intro()}</p>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.placards_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.placards_empty()} />
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
			<TableHeadCell>{m.placards_game()}</TableHeadCell>
			<TableHeadCell class="w-24">{m.placards_score()}</TableHeadCell>
			<TableHeadCell>{m.placards_controller()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="last_action_at"
				label={m.placards_last_action()}
				defaultDir="desc"
				class="w-44"
			/>
			<SortHeader
				state={data.list}
				column="last_seen_at"
				label={m.placards_last_seen()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as placard (placard.id)}
				<TableBodyRow>
					<TableBodyCell class="tabular-nums">
						<a
							href={resolve('/(app)/placards/[id=id]', { id: placard.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							#{placard.id}
						</a>
					</TableBodyCell>
					<TableBodyCell>
						{#if placard.scene === 'match' && placard.homeClub}
							{placard.homeClub} vs {placard.awayClub}
						{:else}
							<span class="text-gray-500 dark:text-gray-400">{m.placards_scene_pairing()}</span>
						{/if}
						<Badge color={placard.online ? 'green' : 'gray'} class="ms-2">
							{placard.online ? m.placards_online() : m.placards_offline()}
						</Badge>
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">
						{#if placard.scene === 'match'}{placard.homeScore}–{placard.awayScore}{/if}
					</TableBodyCell>
					<TableBodyCell>{placard.controllerName ?? ''}</TableBodyCell>
					<TableBodyCell><DateTime value={placard.lastActionAt} /></TableBodyCell>
					<TableBodyCell><DateTime value={placard.lastSeenAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
