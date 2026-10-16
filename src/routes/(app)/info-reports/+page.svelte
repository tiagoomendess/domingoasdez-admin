<script lang="ts">
	import {
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
		{ value: 'sent', label: m.info_reports_status_sent() },
		{ value: 'seen', label: m.info_reports_status_seen() },
		{ value: 'used', label: m.info_reports_status_used() },
		{ value: 'archived', label: m.info_reports_status_archived() },
		{ value: 'deleted', label: m.info_reports_status_deleted() },
		{ value: 'all', label: m.info_reports_status_all() }
	];
</script>

<PageHeader title={m.nav_info_reports()} />

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.info_reports_search_placeholder()} />
	<!-- Open (sent + seen) is the default (empty) value, like the legacy list. -->
	<ListFilter
		name="status"
		value={data.status === 'open' ? null : data.status}
		label={m.info_reports_status()}
		allLabel={m.info_reports_status_open()}
		options={statusOptions}
		class="w-44"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.info_reports_empty()} />
{:else}
	<!-- Opening a report marks it as seen: load it on click only, never on hover. -->
	<Table hoverable shadow data-sveltekit-preload-data="tap">
		<TableHead>
			<SortHeader
				state={data.list}
				column="id"
				label={m.common_id()}
				defaultDir="desc"
				class="w-20"
			/>
			<TableHeadCell>{m.info_reports_content()}</TableHeadCell>
			<TableHeadCell class="w-48">{m.info_reports_author()}</TableHeadCell>
			<SortHeader state={data.list} column="status" label={m.info_reports_status()} class="w-32" />
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.info_reports_received()}
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
					<TableBodyCell class="max-w-md whitespace-normal">
						<a
							href={resolve('/(app)/info-reports/[id=id]', { id: row.id })}
							class={[
								'line-clamp-2 break-words text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400',
								row.status === 'sent' && 'font-semibold'
							]}
						>
							{row.content}
						</a>
						<span class="block truncate text-xs text-gray-500 dark:text-gray-400">
							{row.code} · {row.source}
						</span>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal text-gray-600 dark:text-gray-400">
						{row.userId ? (row.userName ?? `#${row.userId}`) : m.info_reports_anonymous()}
					</TableBodyCell>
					<TableBodyCell><StatusBadge status={row.status} /></TableBodyCell>
					<TableBodyCell><DateTime value={row.createdAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
