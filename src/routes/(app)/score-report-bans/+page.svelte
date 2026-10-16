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
	import BanStatus from './BanStatus.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOptions = [
		{ value: 'active', label: m.score_bans_filter_active() },
		{ value: 'expired', label: m.score_bans_filter_expired() }
	];
</script>

<PageHeader title={m.nav_score_report_bans()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/score-report-bans/new')}
			label={m.score_bans_new()}
			granted={data.user.permissions}
			permission="score-report-bans.create"
		/>
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{m.score_bans_intro()}</p>

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.score_bans_search_placeholder()} />
	<ListFilter
		name="status"
		value={data.status}
		label={m.score_bans_status()}
		allLabel={m.score_bans_filter_all()}
		options={statusOptions}
		class="w-44"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.score_bans_empty()} />
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
			<TableHeadCell class="w-64">{m.score_bans_target()}</TableHeadCell>
			<TableHeadCell>{m.score_bans_reason()}</TableHeadCell>
			<TableHeadCell class="w-28">{m.score_bans_status()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="expires_at"
				label={m.score_bans_expires()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as row (row.id)}
				<TableBodyRow>
					<TableBodyCell class="tabular-nums">
						<a
							href={resolve('/(app)/score-report-bans/[id=id]', { id: row.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
							>{row.id}</a
						>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if row.userId}
							<span class="block font-medium text-gray-900 dark:text-white">
								{row.userName ?? `#${row.userId}`}
							</span>
						{/if}
						{#if row.ipAddress}
							<span class="block font-mono text-xs text-gray-700 dark:text-gray-300">
								{row.ipAddress}
							</span>
						{/if}
						{#if row.uuid}
							<span
								class="block truncate font-mono text-xs text-gray-500 dark:text-gray-400"
								title={row.uuid}>{row.uuid}</span
							>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<span class="line-clamp-2 text-gray-700 dark:text-gray-300">{row.reason ?? '–'}</span>
						{#if row.shadowBan || row.ipBan}
							<div class="mt-1 flex flex-wrap gap-1">
								{#if row.shadowBan}<Badge color="purple">{m.score_bans_shadow()}</Badge>{/if}
								{#if row.ipBan}<Badge color="yellow">{m.score_bans_ip_ban()}</Badge>{/if}
							</div>
						{/if}
					</TableBodyCell>
					<TableBodyCell><BanStatus active={row.active} /></TableBodyCell>
					<TableBodyCell class="text-gray-600 dark:text-gray-400">
						{#if row.expiresAt}<DateTime value={row.expiresAt} />{:else}–{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
