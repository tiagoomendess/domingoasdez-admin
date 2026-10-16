<script lang="ts">
	import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import CopyButton from '#lib/components/CopyButton.svelte';
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
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOptions = [
		{ value: 'waiting', label: m.game_comments_status_waiting() },
		{ value: 'answered', label: m.game_comments_status_answered() },
		{ value: 'expired', label: m.game_comments_status_expired() },
		{ value: 'used', label: m.game_comments_status_used() }
	];
</script>

<PageHeader title={m.nav_game_comments()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/game-comments/new')}
			label={m.game_comments_new()}
			granted={data.user.permissions}
			permission="games.create"
		/>
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{m.game_comments_intro()}</p>

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.game_comments_search_placeholder()} />
	<ListFilter
		name="status"
		value={data.status}
		label={m.game_comments_status()}
		allLabel={m.game_comments_status_all()}
		options={statusOptions}
		class="w-56"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.game_comments_empty()} />
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
			<th class="px-6 py-3">{m.game_comments_game()}</th>
			<th class="px-6 py-3">{m.game_comments_comment()}</th>
			<SortHeader
				state={data.list}
				column="deadline"
				label={m.game_comments_deadline()}
				defaultDir="desc"
				class="w-40"
			/>
			<th class="w-12 px-2 py-3"><span class="sr-only">{m.game_comments_copy_link()}</span></th>
		</TableHead>
		<TableBody>
			{#each data.rows as comment (comment.id)}
				<TableBodyRow>
					<TableBodyCell class="align-top text-gray-500 tabular-nums dark:text-gray-400"
						>{comment.id}</TableBodyCell
					>
					<TableBodyCell class="align-top whitespace-normal">
						<a
							href={resolve('/(app)/game-comments/[id=id]', { id: comment.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{comment.homeClub} vs {comment.awayClub}
						</a>
						<span class="mt-1 flex flex-wrap items-center gap-1.5">
							<Badge color={comment.side === 'home' ? 'blue' : 'yellow'}>
								{comment.side === 'home' ? m.game_comments_home() : m.game_comments_away()} · {comment.teamClub}
							</Badge>
							<StatusBadge status={comment.status} />
						</span>
					</TableBodyCell>
					<TableBodyCell
						class="max-w-xl align-top text-sm whitespace-normal text-gray-700 dark:text-gray-300"
					>
						{#if comment.content.trim()}
							<p class="line-clamp-3">{comment.content}</p>
						{:else}
							<span class="text-gray-400 italic">{m.game_comments_no_comment()}</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="align-top text-sm"
						><DateTime value={comment.deadline} /></TableBodyCell
					>
					<TableBodyCell class="px-2 align-top">
						<CopyButton
							text={comment.link}
							label={m.game_comments_copy_link()}
							copiedLabel={m.game_comments_link_copied()}
						/>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
