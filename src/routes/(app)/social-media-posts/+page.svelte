<script lang="ts">
	import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
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
	import StatusBadge from './StatusBadge.svelte';
	import { contentLabels, options, platformLabels, typeLabels } from './labels';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOptions = [
		{ value: 'pending', label: m.social_posts_status_pending() },
		{ value: 'published', label: m.social_posts_status_published() },
		{ value: 'failed', label: m.social_posts_status_failed() },
		{ value: 'missed', label: m.social_posts_status_missed() }
	];
</script>

<PageHeader title={m.social_posts_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/social-media-posts/new')}
			label={m.social_posts_new()}
			granted={data.user.permissions}
			permission="social_media_posts.create"
		/>
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{m.social_posts_intro()}</p>

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.social_posts_search_placeholder()} />
	<ListFilter
		name="status"
		value={data.status}
		label={m.social_posts_status()}
		allLabel={m.social_posts_status_all()}
		options={statusOptions}
		class="w-56"
	/>
	<ListFilter
		name="platform"
		value={data.platform}
		label={m.social_posts_platform()}
		allLabel={m.social_posts_platform_all()}
		options={options(platformLabels)}
		class="w-48"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.social_posts_empty()} />
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
			<SortHeader
				state={data.list}
				column="publish_at"
				label={m.social_posts_publish_at()}
				defaultDir="desc"
				class="w-44"
			/>
			<th class="px-6 py-3">{m.social_posts_platform()}</th>
			<th class="px-6 py-3">{m.social_posts_content()}</th>
			<th class="px-6 py-3">{m.social_posts_status()}</th>
		</TableHead>
		<TableBody>
			{#each data.rows as post (post.id)}
				{@const href = resolve('/(app)/social-media-posts/[id=id]', { id: post.id })}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400">
						<a {href} class="hover:text-primary-700 hover:underline dark:hover:text-primary-400"
							>{post.id}</a
						>
					</TableBodyCell>
					<TableBodyCell><DateTime value={post.publishAt} /></TableBodyCell>
					<TableBodyCell>
						<a
							{href}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{platformLabels[post.platform]()} · {typeLabels[post.postType]()}
						</a>
					</TableBodyCell>
					<TableBodyCell class="max-w-md">
						<span class="flex items-center gap-3">
							{#if post.postContentType === 'image' && post.mediaPath}
								<img
									src={post.mediaPath}
									alt=""
									class="size-10 shrink-0 rounded object-cover"
									loading="lazy"
								/>
							{:else}
								<span class="w-16 shrink-0 text-xs text-gray-500 dark:text-gray-400"
									>{contentLabels[post.postContentType]()}</span
								>
							{/if}
							<span class="truncate text-gray-700 dark:text-gray-300" title={post.textContent}>
								{post.textContent || m.social_posts_no_text()}
							</span>
						</span>
					</TableBodyCell>
					<TableBodyCell><StatusBadge status={post.status} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
