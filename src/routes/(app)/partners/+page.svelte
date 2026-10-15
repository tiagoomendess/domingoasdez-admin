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
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.partners_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/partners/new')}
			label={m.partners_new()}
			granted={data.user.permissions}
			permission="partners.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.partners_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.partners_empty()} />
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
			<TableHeadCell class="w-28"><span class="sr-only">{m.partners_picture()}</span></TableHeadCell
			>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader state={data.list} column="priority" label={m.partners_priority()} class="w-28" />
			<SortHeader
				state={data.list}
				column="clicks"
				label={m.partners_clicks()}
				defaultDir="desc"
				class="w-28"
			/>
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.common_created_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as partner (partner.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{partner.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						{#if partner.picture}
							<img src={partner.picture} alt="" class="h-9 w-20 object-contain" loading="lazy" />
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						<a
							href={resolve('/(app)/partners/[id=id]', { id: partner.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{partner.name}
						</a>
						{#if !partner.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
						<span class="block max-w-xs truncate text-xs text-gray-500 dark:text-gray-400">
							{partner.url}
						</span>
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{partner.priority}</TableBodyCell>
					<TableBodyCell class="tabular-nums"
						>{formatNumber(partner.clicks, getLocale())}</TableBodyCell
					>
					<TableBodyCell><DateTime value={partner.createdAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
