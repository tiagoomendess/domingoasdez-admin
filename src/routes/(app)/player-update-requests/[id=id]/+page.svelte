<script lang="ts">
	import { Alert, Badge, Card, Heading } from 'flowbite-svelte';
	import { ExclamationCircleOutline, InfoCircleOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { formatDate, formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import ReviewForm from '../ReviewForm.svelte';
	import StatusBadge from '../StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const creating = $derived(!data.request.playerId || !data.player);
	const title = $derived(
		data.player?.name ?? data.request.name ?? m.update_requests_title_one({ id: data.request.id })
	);
	const pending = $derived(data.request.status === 'pending');
</script>

<PageHeader
	{title}
	back={resolve('/(app)/player-update-requests')}
	backLabel={m.nav_player_update_requests()}
>
	{#snippet actions()}
		<StatusBadge status={data.request.status} large />
		{#if data.canDelete}
			<DeleteButton title={m.update_requests_delete_title({ id: data.request.id })}>
				{m.update_requests_delete_text()}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<p
	class="-mt-4 mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400"
>
	<Badge color={creating ? 'purple' : 'blue'}>
		{creating ? m.update_requests_type_create() : m.update_requests_type_update()}
	</Badge>
	<span>#{data.request.id}</span>
	<span aria-hidden="true">·</span>
	<span>
		{m.update_requests_sent_by({ source: data.request.createdBy ?? '–' })}
		<DateTime value={data.request.createdAt} />
	</span>
	{#if pending}
		<span aria-hidden="true">·</span>
		<span
			>{m.update_requests_pending_total({
				count: formatNumber(data.pendingTotal, getLocale())
			})}</span
		>
	{/if}
</p>

{#if !pending}
	<Alert color={data.request.status === 'approved' ? 'green' : 'red'} class="mb-6">
		<p class="font-medium">
			{data.request.status === 'approved'
				? m.update_requests_was_approved({ name: data.request.reviewer ?? '–' })
				: m.update_requests_was_denied({ name: data.request.reviewer ?? '–' })}
			<DateTime value={data.request.reviewedAt} />
		</p>
		{#if data.request.reviewNotes}
			<p class="mt-1">{data.request.reviewNotes}</p>
		{/if}
	</Alert>
{:else if !data.canReview}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid gap-6 xl:grid-cols-[1fr_20rem]">
	<div class="min-w-0">
		{#key data.request.id}
			<ReviewForm
				rows={data.rows}
				club={data.club}
				squad={data.request.team}
				currentTeam={data.player?.team ?? null}
				{creating}
				readonly={!data.canReview}
				nextId={data.nextId}
				{form}
			/>
		{/key}
	</div>

	<aside class="space-y-6">
		{#if data.player}
			<Card size="xl" class="p-5">
				<Heading tag="h2" class="mb-3 text-base font-medium">{m.update_requests_player()}</Heading>
				<a
					href={resolve('/(app)/players/[id=id]', { id: data.player.id })}
					class="flex items-center gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
				>
					<img src={data.player.picture} alt="" class="size-12 rounded-full object-cover" />
					<span>
						<span class="block font-medium text-gray-900 dark:text-white">{data.player.name}</span>
						<span class="block text-xs text-gray-500 dark:text-gray-400">
							{data.player.team?.label ?? m.players_no_team()}
						</span>
					</span>
				</a>
			</Card>
		{/if}

		{#if data.request.note}
			<Card size="xl" class="p-5">
				<Heading tag="h2" class="mb-2 flex items-center gap-2 text-base font-medium">
					<InfoCircleOutline
						class="size-5 text-primary-600 dark:text-primary-400"
						aria-hidden="true"
					/>
					{m.update_requests_note()}
				</Heading>
				<p class="text-sm text-gray-700 dark:text-gray-300">{data.request.note}</p>
			</Card>
		{/if}

		{#if data.duplicates.length}
			<Card size="xl" class="border-amber-300 p-5 dark:border-amber-700">
				<Heading tag="h2" class="mb-1 flex items-center gap-2 text-base font-medium">
					<ExclamationCircleOutline
						class="size-5 text-amber-600 dark:text-amber-400"
						aria-hidden="true"
					/>
					{m.update_requests_duplicates()}
				</Heading>
				<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
					{m.update_requests_duplicates_hint()}
				</p>
				<ul class="space-y-2">
					{#each data.duplicates as player (player.id)}
						<li>
							<a
								href={resolve('/(app)/players/[id=id]', { id: player.id })}
								class="flex items-center gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
							>
								<img src={player.picture} alt="" class="size-10 rounded-full object-cover" />
								<span class="text-sm">
									<span class="block font-medium text-gray-900 dark:text-white"
										>{player.name} <span class="text-gray-400">#{player.id}</span></span
									>
									<span class="block text-xs text-gray-500 dark:text-gray-400">
										{[
											player.clubName,
											player.birthDate ? formatDate(player.birthDate, getLocale()) : null
										]
											.filter(Boolean)
											.join(' · ') || '–'}
									</span>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</Card>
		{/if}
	</aside>
</div>
