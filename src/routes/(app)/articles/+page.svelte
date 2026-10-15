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
	import { formatDate } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.articles_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/articles/new')}
			label={m.articles_new()}
			granted={data.user.permissions}
			permission="articles.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.articles_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.articles_empty()} />
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
			<TableHeadCell class="w-24"><span class="sr-only">{m.articles_cover()}</span></TableHeadCell>
			<SortHeader state={data.list} column="title" label={m.articles_title_field()} />
			<TableHeadCell class="w-40">{m.articles_author()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="date"
				label={m.articles_date()}
				defaultDir="desc"
				class="w-32"
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
			{#each data.rows as article (article.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{article.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						{#if article.cover}
							<img
								src={article.cover}
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
							href={resolve('/(app)/articles/[id=id]', { id: article.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{article.title}
						</a>
						{#if !article.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="text-gray-600 dark:text-gray-400"
						>{article.author ?? '—'}</TableBodyCell
					>
					<TableBodyCell class="whitespace-nowrap"
						>{formatDate(article.date, getLocale())}</TableBodyCell
					>
					<TableBodyCell><DateTime value={article.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
