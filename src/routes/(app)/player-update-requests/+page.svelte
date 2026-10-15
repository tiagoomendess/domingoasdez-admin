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
	import { ImageOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import StatusBadge from './StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOptions = [
		{ value: 'approved', label: m.update_requests_status_approved() },
		{ value: 'denied', label: m.update_requests_status_denied() },
		{ value: 'all', label: m.update_requests_status_all() }
	];
	const typeOptions = [
		{ value: 'update', label: m.update_requests_type_update() },
		{ value: 'create', label: m.update_requests_type_create() }
	];

	/** `no_club` / `none` are how the source says "no club". */
	const clubLabel = (club: string | null) =>
		club === 'no_club' || club === 'none' ? m.update_requests_leaves_club() : club;
</script>

<PageHeader title={m.nav_player_update_requests()} />

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.update_requests_search_placeholder()} />
	<!-- Pending is the default (empty) value, like the legacy list. -->
	<ListFilter
		name="status"
		value={data.status === 'pending' ? null : data.status}
		label={m.update_requests_status()}
		allLabel={m.update_requests_status_pending()}
		options={statusOptions}
		class="w-44"
	/>
	<ListFilter
		name="type"
		value={data.type}
		label={m.update_requests_type()}
		allLabel={m.update_requests_type_all()}
		options={typeOptions}
		class="w-48"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.update_requests_empty()} />
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
			<SortHeader state={data.list} column="name" label={m.update_requests_player()} />
			<SortHeader state={data.list} column="club" label={m.update_requests_club()} class="w-56" />
			<TableHeadCell class="w-28">{m.update_requests_status()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.update_requests_received()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as row (row.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{row.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<img
							src={row.playerPicture}
							alt=""
							class="size-10 max-w-none min-w-10 rounded-full object-cover"
							loading="lazy"
						/>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/player-update-requests/[id=id]', { id: row.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{row.playerName ?? row.name ?? `#${row.id}`}
						</a>
						{#if !row.playerId}
							<Badge color="purple" class="ms-2">{m.update_requests_type_create()}</Badge>
						{/if}
						{#if row.hasPicture}
							<ImageOutline
								class="ms-1 inline size-4 text-gray-400"
								aria-label={m.update_requests_has_picture()}
							/>
						{/if}
						{#if row.nickname}
							<span class="block text-xs text-gray-500 dark:text-gray-400">{row.nickname}</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal text-gray-600 dark:text-gray-400">
						{clubLabel(row.clubName) ?? '–'}
						{#if row.team}
							<span class="block text-xs text-gray-500 dark:text-gray-400">{row.team}</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell><StatusBadge status={row.status} /></TableBodyCell>
					<TableBodyCell>
						<DateTime value={row.createdAt} />
						{#if row.createdBy}
							<span class="block text-xs text-gray-500 dark:text-gray-400">{row.createdBy}</span>
						{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
