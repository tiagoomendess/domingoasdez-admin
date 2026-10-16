<script lang="ts">
	import {
		Badge,
		Button,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline, CloseOutline } from 'flowbite-svelte-icons';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DateTime from '#lib/components/DateTime.svelte';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { listHref } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import ActionBadge from './ActionBadge.svelte';
	import { ACTIONS, actionLabel } from './actions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const actionOptions = ACTIONS.map((value) => ({ value, label: actionLabel(value) }));
	const modelOptions = $derived(data.models.map((value) => ({ value, label: value })));

	const filtered = $derived(Object.values(data.filters).some((value) => value !== null));

	/** Shown changed fields per row; the rest is counted. */
	const MAX_FIELDS = 4;
</script>

<PageHeader title={m.nav_audit()} />

<div class="mb-4 flex flex-wrap items-start gap-3">
	<ListSearch q={data.list.q} placeholder={m.audit_search_placeholder()} />
	<ListFilter
		name="action"
		value={data.filters.action}
		label={m.audit_action()}
		allLabel={m.audit_all_actions()}
		options={actionOptions}
		class="w-44"
	/>
	<ListFilter
		name="model"
		value={data.filters.model}
		label={m.audit_model()}
		allLabel={m.audit_all_models()}
		options={modelOptions}
		class="w-52"
	/>
	<div class="w-64">
		<SearchSelect
			name="user"
			endpoint={resolve('/api/options/users')}
			value={data.user}
			label={m.audit_user()}
			placeholder={m.audit_all_users()}
			onchange={(option) => goto(listHref(page.url, { user: option?.value ?? null, page: null }))}
		/>
	</div>
	{#if data.filters.modelId}
		<!-- Set from an entry's "history" link: every change to one row. -->
		<a
			href={listHref(page.url, { model_id: null, page: null })}
			class="inline-flex items-center gap-1.5 self-center rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-800"
			title={m.audit_clear_entity()}
		>
			{data.filters.model ?? m.audit_model()} #{data.filters.modelId}
			<CloseOutline class="size-3.5" aria-hidden="true" />
			<span class="sr-only">{m.audit_clear_entity()}</span>
		</a>
	{/if}
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={filtered ? m.audit_empty_filtered() : m.audit_empty()}>
		{#snippet actions()}
			{#if filtered}
				<Button href={resolve('/(app)/audit')} color="alternative" size="sm">
					{m.audit_clear_filters()}
				</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<Table hoverable shadow>
		<TableHead>
			<SortHeader
				state={data.list}
				column="id"
				label={m.common_id()}
				defaultDir="desc"
				class="w-24"
			/>
			<TableHeadCell class="w-40">{m.audit_date()}</TableHeadCell>
			<TableHeadCell class="w-48">{m.audit_user()}</TableHeadCell>
			<TableHeadCell class="w-32">{m.audit_action()}</TableHeadCell>
			<TableHeadCell class="w-48">{m.audit_entity()}</TableHeadCell>
			<TableHeadCell>{m.audit_details()}</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each data.rows as row (row.id)}
				<TableBodyRow>
					<TableBodyCell class="tabular-nums">
						<a
							href={resolve('/(app)/audit/[id=id]', { id: row.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
							>{row.id}</a
						>
					</TableBodyCell>
					<TableBodyCell class="text-gray-600 dark:text-gray-400">
						<DateTime value={row.createdAt} />
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if row.userId}
							<a
								href={listHref(page.url, { user: row.userId, page: null })}
								class="text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
								title={m.audit_filter_user()}>{row.userName ?? `#${row.userId}`}</a
							>
						{:else}
							<span class="text-gray-500 dark:text-gray-400">{m.audit_no_user()}</span>
						{/if}
						{#if row.ipAddress}
							<span class="block text-xs text-gray-500 dark:text-gray-400">
								{row.ipAddress}{row.ipCountry && row.ipCountry !== 'Unknown'
									? ` · ${row.ipCountry}`
									: ''}
							</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell><ActionBadge action={row.action} /></TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if row.model}
							{#if row.modelId}
								<a
									href={listHref(page.url, {
										model: row.model,
										model_id: row.modelId,
										page: null
									})}
									class="text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
									title={m.audit_history()}>{row.model} #{row.modelId}</a
								>
							{:else}
								{row.model}
							{/if}
							{#if row.entityPath}
								<a
									href={resolvePath(row.entityPath)}
									class="ms-1 inline-block align-middle text-gray-400 hover:text-primary-700 dark:hover:text-primary-400"
									title={m.audit_open_entity()}
								>
									<ArrowUpRightFromSquareOutline class="size-3.5" aria-hidden="true" />
									<span class="sr-only">{m.audit_open_entity()}</span>
								</a>
							{/if}
						{:else}
							<span class="text-gray-500 dark:text-gray-400">–</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if row.changed.length}
							<div class="flex flex-wrap gap-1">
								{#each row.changed.slice(0, MAX_FIELDS) as field (field)}
									<Badge color="gray" class="font-mono">{field}</Badge>
								{/each}
								{#if row.changed.length > MAX_FIELDS}
									<span class="text-xs text-gray-500 dark:text-gray-400">
										{m.audit_more_fields({ count: row.changed.length - MAX_FIELDS })}
									</span>
								{/if}
							</div>
						{/if}
						{#if row.extraInfo}
							<span class="block text-xs break-words text-gray-500 dark:text-gray-400"
								>{row.extraInfo}</span
							>
						{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
