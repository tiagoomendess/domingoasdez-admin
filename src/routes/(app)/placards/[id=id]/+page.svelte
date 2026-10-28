<script lang="ts">
	import {
		A,
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
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const placard = $derived(data.placard);
	const canEdit = $derived(can(data.user.permissions, 'placards.edit'));
	const payloadText = (payload: unknown) =>
		payload === null || payload === undefined ? '' : JSON.stringify(payload);
</script>

<PageHeader
	title={m.placards_heading({ id: placard.id })}
	back={resolve('/(app)/placards')}
	backLabel={m.placards_title()}
/>

<Card size="xl" class="mb-6 max-w-3xl p-6">
	<dl class="grid gap-4 text-sm sm:grid-cols-2">
		<div>
			<dt class="text-gray-500 dark:text-gray-400">{m.placards_scene()}</dt>
			<dd class="mt-1 flex items-center gap-2 text-gray-900 dark:text-white">
				{placard.scene === 'match' ? m.placards_scene_match() : m.placards_scene_pairing()}
				<Badge color={placard.online ? 'green' : 'gray'}>
					{placard.online ? m.placards_online() : m.placards_offline()}
				</Badge>
			</dd>
		</div>
		<div>
			<dt class="text-gray-500 dark:text-gray-400">{m.placards_last_seen()}</dt>
			<dd class="mt-1 text-gray-900 dark:text-white"><DateTime value={placard.lastSeenAt} /></dd>
		</div>
		{#if placard.gameId && placard.homeClub}
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.placards_game()}</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">
					<A href={resolve('/(app)/games/[id=id]', { id: placard.gameId })}>
						{placard.homeClub} vs {placard.awayClub}
					</A>
				</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.placards_score()}</dt>
				<dd class="mt-1 text-gray-900 tabular-nums dark:text-white">
					{placard.homeScore}–{placard.awayScore}
				</dd>
			</div>
		{/if}
		{#if placard.controllerUserId}
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.placards_controller()}</dt>
				<dd class="mt-1 text-gray-900 dark:text-white">
					<A href={resolve('/(app)/users/[id=id]', { id: placard.controllerUserId })}>
						{placard.controllerName ?? `#${placard.controllerUserId}`}
					</A>
				</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.placards_paired_at()}</dt>
				<dd class="mt-1 text-gray-900 dark:text-white"><DateTime value={placard.pairedAt} /></dd>
			</div>
		{/if}
		<div>
			<dt class="text-gray-500 dark:text-gray-400">{m.common_created_at()}</dt>
			<dd class="mt-1 text-gray-900 dark:text-white"><DateTime value={placard.createdAt} /></dd>
		</div>
	</dl>

	{#if canEdit && placard.scene !== 'pairing'}
		<form method="POST" action="?/release" use:enhance class="mt-4 flex items-center gap-3">
			<Button type="submit" color="alternative">{m.placards_release()}</Button>
			<span class="text-sm text-gray-500 dark:text-gray-400">{m.placards_release_hint()}</span>
		</form>
	{/if}
</Card>

<Card size="xl" class="max-w-3xl p-6">
	<Heading tag="h2" class="mb-4 w-auto text-lg font-medium">{m.placards_events()}</Heading>
	{#if data.events.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">{m.placards_no_events()}</p>
	{:else}
		<Table>
			<TableHead>
				<TableHeadCell class="w-44">{m.placards_event_time()}</TableHeadCell>
				<TableHeadCell>{m.placards_event_type()}</TableHeadCell>
				<TableHeadCell>{m.placards_controller()}</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each data.events as event (event.id)}
					<TableBodyRow>
						<TableBodyCell><DateTime value={event.createdAt} /></TableBodyCell>
						<TableBodyCell>
							<span class="font-mono">{event.type}</span>
							<span class="ms-2 font-mono text-xs text-gray-500 dark:text-gray-400">
								{payloadText(event.payload)}
							</span>
						</TableBodyCell>
						<TableBodyCell>{event.userName ?? ''}</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</Card>
