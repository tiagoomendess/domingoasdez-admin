<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Card,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { PUBLIC_FRONTEND_URL } from '$app/env/public';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { formatDate } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { resolvePath } from '#lib/paths.ts';
	import { slugify } from '#lib/slug.ts';
	import PlayerForm from '../PlayerForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'players.edit'));
	const canDelete = $derived(can(data.user.permissions, 'players.create'));
	const publicUrl = $derived(
		`${PUBLIC_FRONTEND_URL}/jogadores/${data.player.id}/${slugify(data.player.name)}`
	);
	/** `transfers.date` is a calendar date stored at midnight UTC. */
	const transferDate = (date: Date | string) =>
		formatDate(new Date(date).toISOString().slice(0, 10), getLocale());
</script>

<PageHeader title={data.player.name} back={resolve('/(app)/players')} backLabel={m.players_title()}>
	{#snippet actions()}
		{#if data.player.visible}
			<Button
				href={publicUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.players_open_public()}
			</Button>
		{:else}
			<Badge color="gray" large>{m.common_hidden()}</Badge>
		{/if}
		{#if canDelete}
			<DeleteButton title={m.players_delete_title({ name: data.player.name })}>
				{#if data.usage}
					{#if data.usage.agents}
						<p>{m.players_delete_agents({ count: data.usage.agents })}</p>
					{:else if data.usage.goals || data.usage.mvpVotes || data.usage.transfers}
						<p>
							{m.players_delete_usage({
								goals: data.usage.goals,
								votes: data.usage.mvpVotes,
								transfers: data.usage.transfers
							})}
						</p>
					{/if}
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	#{data.player.id} · {m.common_created_at()}
	<DateTime value={data.player.createdAt} /> · {m.common_updated_at()}
	<DateTime value={data.player.updatedAt} />
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<PlayerForm
	player={data.player}
	team={data.team}
	picture={data.picture}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/players')}
/>

<Card size="xl" class="mt-6 p-6">
	<div class="mb-1 flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h2" class="text-lg font-medium">{m.players_transfers()}</Heading>
		{#if can(data.user.permissions, 'transfers')}
			<a
				href={resolvePath(`/transfers?player=${data.player.id}`)}
				class="text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
				>{m.players_manage_transfers()}</a
			>
		{/if}
	</div>
	<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{m.players_transfers_hint()}</p>
	{#if data.transfers.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.players_transfers_empty()}</p>
	{:else}
		<Table>
			<TableHead>
				<TableHeadCell class="w-40">{m.players_transfer_date()}</TableHeadCell>
				<TableHeadCell>{m.players_team()}</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each data.transfers as transfer (transfer.id)}
					<TableBodyRow>
						<TableBodyCell>{transferDate(transfer.date)}</TableBodyCell>
						<TableBodyCell class="whitespace-normal">
							{#if transfer.clubName}
								<span class="flex items-center gap-2">
									<img src={transfer.clubEmblem} alt="" class="size-6 object-contain" />
									{transfer.clubName} · {transfer.teamName}
								</span>
							{:else}
								<span class="text-gray-500 dark:text-gray-400">{m.players_no_team()}</span>
							{/if}
							{#if !transfer.visible}
								<Badge color="gray" class="ms-2">{m.common_hidden()}</Badge>
							{/if}
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</Card>
