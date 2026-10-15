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
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.pages_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/pages/new')}
			label={m.pages_new()}
			granted={data.user.permissions}
			permission="pages.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.pages_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.pages_empty()} />
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
			<TableHeadCell class="w-24"><span class="sr-only">{m.pages_picture()}</span></TableHeadCell>
			<SortHeader state={data.list} column="title" label={m.pages_title_field()} />
			<SortHeader state={data.list} column="name" label={m.pages_name()} class="w-56" />
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.common_created_at()}
				defaultDir="desc"
				class="w-44"
			/>
			<SortHeader
				state={data.list}
				column="updated_at"
				label={m.common_updated_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as page (page.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{page.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						{#if page.picture}
							<img
								src={page.picture}
								alt=""
								class="aspect-video w-20 rounded-sm object-cover"
								loading="lazy"
							/>
						{:else}
							<span
								class="flex aspect-video w-20 items-center justify-center rounded-sm bg-gray-100 dark:bg-gray-700"
							>
								<ImageOutline class="size-5 text-gray-400" aria-hidden="true" />
							</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/pages/[id=id]', { id: page.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{page.title}
						</a>
						{#if !page.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
						<span class="block text-xs text-gray-500 dark:text-gray-400">/p/{page.slug}</span>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal text-gray-600 dark:text-gray-400"
						>{page.name}</TableBodyCell
					>
					<TableBodyCell><DateTime value={page.createdAt} /></TableBodyCell>
					<TableBodyCell><DateTime value={page.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
