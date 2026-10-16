<script lang="ts">
	import { Badge, Table, TableBody, TableBodyCell, TableBodyRow, TableHead } from 'flowbite-svelte';
	import { MapPinAltOutline } from 'flowbite-svelte-icons';
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

<PageHeader title={m.nav_playgrounds()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/playgrounds/new')}
			label={m.playgrounds_new()}
			granted={data.user.permissions}
			permission="playgrounds.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.playgrounds_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.playgrounds_empty()} />
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
			<th class="w-28 px-6 py-3"><span class="sr-only">{m.players_picture()}</span></th>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader state={data.list} column="club" label={m.playgrounds_club()} class="w-56" />
			<SortHeader
				state={data.list}
				column="games"
				label={m.game_groups_games()}
				defaultDir="desc"
				class="w-24"
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
			{#each data.rows as playground (playground.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{playground.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						{#if playground.picture}
							<img
								src={playground.picture}
								alt=""
								class="aspect-video w-24 max-w-none rounded-sm object-cover"
								loading="lazy"
							/>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/playgrounds/[id=id]', { id: playground.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{playground.name}
						</a>
						<span
							class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
						>
							{playground.surface}
							{#if playground.hasLocation}
								<MapPinAltOutline
									class="size-3.5 text-green-600"
									aria-label={m.playgrounds_has_location()}
								/>
							{:else}
								<Badge color="yellow">{m.playgrounds_no_location()}</Badge>
							{/if}
							{#if !playground.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
						</span>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if playground.clubName}
							<span class="flex items-center gap-2">
								<img
									src={playground.clubEmblem}
									alt=""
									class="size-6 object-contain"
									loading="lazy"
								/>
								{playground.clubName}
							</span>
						{:else}
							<span class="text-gray-400">—</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{playground.games}</TableBodyCell>
					<TableBodyCell><DateTime value={playground.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
