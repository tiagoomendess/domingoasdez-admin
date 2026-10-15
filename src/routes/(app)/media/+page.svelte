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
	import { FileOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { mediaTypeLabel, mediaTypeOptions } from '#lib/media-types.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tags = (value: string | null) => value?.replaceAll(',', ', ') || '—';
</script>

<PageHeader title={m.media_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/media/new')}
			label={m.media_new()}
			granted={data.user.permissions}
			permission="media.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap gap-3">
	<div class="min-w-64 flex-1">
		<ListSearch q={data.list.q} placeholder={m.media_search_placeholder()} />
	</div>
	<ListFilter
		name="type"
		value={data.type}
		label={m.media_type()}
		allLabel={m.media_type_all()}
		options={mediaTypeOptions()}
		class="w-48"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.media_empty()} />
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
			<TableHeadCell class="w-28"><span class="sr-only">{m.media_thumbnail()}</span></TableHeadCell>
			<SortHeader state={data.list} column="tags" label={m.media_tags()} />
			<SortHeader state={data.list} column="media_type" label={m.media_type()} class="w-36" />
			<TableHeadCell class="w-40">{m.media_uploaded_by()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.common_created_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as item (item.id)}
				{@const href = resolve('/(app)/media/[id=id]', { id: item.id })}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{item.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<a {href} tabindex="-1" aria-hidden="true">
							{#if item.thumbnail}
								<img
									src={item.thumbnail}
									alt=""
									class="aspect-video w-24 rounded-sm bg-gray-100 object-cover dark:bg-gray-700"
									loading="lazy"
								/>
							{:else}
								<span
									class="flex aspect-video w-24 items-center justify-center rounded-sm bg-gray-100 dark:bg-gray-700"
								>
									<FileOutline class="size-5 text-gray-400" />
								</span>
							{/if}
						</a>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							{href}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{tags(item.tags)}
						</a>
						{#if !item.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell><Badge color="blue">{mediaTypeLabel(item.mediaType)}</Badge></TableBodyCell
					>
					<TableBodyCell class="text-gray-600 dark:text-gray-400"
						>{item.author ?? '—'}</TableBodyCell
					>
					<TableBodyCell><DateTime value={item.createdAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
