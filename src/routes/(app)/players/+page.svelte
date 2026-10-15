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
	import { formatDate } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { positionLabel, positionOptions } from '#lib/player-positions.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.players_title()}>
	{#snippet actions()}
		<!-- Legacy showed "add" to `players.edit`; creating needs `players.create`. -->
		<CreateButton
			href={resolve('/(app)/players/new')}
			label={m.players_new()}
			granted={data.user.permissions}
			permission="players.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.players_search_placeholder()} />
	<ListFilter
		name="position"
		value={data.position}
		label={m.players_position()}
		allLabel={m.players_position_all()}
		options={positionOptions()}
		class="w-48"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.players_empty()} />
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
			<TableHeadCell class="w-16"><span class="sr-only">{m.players_picture()}</span></TableHeadCell>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader
				state={data.list}
				column="birth_date"
				label={m.players_birth_date()}
				defaultDir="desc"
				class="w-36"
			/>
			<SortHeader state={data.list} column="club" label={m.players_club()} class="w-56" />
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.common_created_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as player (player.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{player.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<img
							src={player.picture}
							alt=""
							class="size-10 max-w-none min-w-10 rounded-full object-cover"
							loading="lazy"
						/>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/players/[id=id]', { id: player.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{player.name}
						</a>
						{#if !player.visible}
							<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
						{/if}
						<span class="block text-xs text-gray-500 dark:text-gray-400">
							{[player.nickname, positionLabel(player.position)].filter(Boolean).join(' · ')}
						</span>
					</TableBodyCell>
					<TableBodyCell class="text-gray-600 dark:text-gray-400">
						{player.birthDate ? formatDate(player.birthDate, getLocale()) : '–'}
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						{#if player.clubName}
							<span class="flex items-center gap-2">
								<img
									src={player.clubEmblem}
									alt=""
									class="size-6 shrink-0 object-contain"
									loading="lazy"
								/>
								<span>
									{player.clubName}
									<span class="block text-xs text-gray-500 dark:text-gray-400"
										>{player.teamName}</span
									>
								</span>
							</span>
						{:else}
							<span class="text-gray-400">–</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell><DateTime value={player.createdAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
