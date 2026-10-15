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
	import { PUBLIC_FRONTEND_URL } from '$app/env/public';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import CopyLinkButton from './CopyLinkButton.svelte';
	import PollStatusBadge from './PollStatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.polls_title()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/polls/new')}
			label={m.polls_new()}
			granted={data.user.permissions}
			permission="polls.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.polls_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.polls_empty()} />
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
			<TableHeadCell class="w-28"><span class="sr-only">{m.polls_image()}</span></TableHeadCell>
			<SortHeader state={data.list} column="question" label={m.polls_question()} />
			<TableHeadCell class="w-28">{m.polls_status()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="publish_after"
				label={m.polls_publish_after()}
				defaultDir="desc"
				class="w-44"
			/>
			<SortHeader
				state={data.list}
				column="close_after"
				label={m.polls_close_after()}
				defaultDir="desc"
				class="w-44"
			/>
			<TableHeadCell class="w-12"><span class="sr-only">{m.polls_copy_link()}</span></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each data.rows as poll (poll.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{poll.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<img
							src={poll.image}
							alt=""
							class="aspect-video w-24 rounded-sm object-cover"
							loading="lazy"
						/>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/polls/[id=id]', { id: poll.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{poll.question}
						</a>
						<span class="block text-xs text-gray-500 dark:text-gray-400">
							{m.polls_answer_count({ count: poll.answers })}
						</span>
					</TableBodyCell>
					<TableBodyCell><PollStatusBadge status={poll.status} /></TableBodyCell>
					<TableBodyCell><DateTime value={poll.publishAfter} /></TableBodyCell>
					<TableBodyCell><DateTime value={poll.closeAfter} /></TableBodyCell>
					<TableBodyCell class="px-2">
						<CopyLinkButton url={`${PUBLIC_FRONTEND_URL}/sondagens/${poll.slug}`} />
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
