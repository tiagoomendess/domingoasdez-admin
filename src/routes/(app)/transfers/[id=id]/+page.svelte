<script lang="ts">
	import { Alert, Button } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import Timeline from '../Timeline.svelte';
	import TransferForm from '../TransferForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'transfers.edit'));
	const canCreate = $derived(can(data.user.permissions, 'transfers.create'));
	const playerName = $derived(data.summary?.name ?? `#${data.transfer.playerId}`);
</script>

<PageHeader
	title={m.transfers_title_one({ player: playerName })}
	back={resolvePath(`/transfers?player=${data.transfer.playerId}`)}
	backLabel={m.transfers_player_history()}
>
	{#snippet actions()}
		{#if canCreate}
			<Button
				href={resolvePath(`/transfers/new?player=${data.transfer.playerId}`)}
				color="alternative"
				class="gap-2"
			>
				<PlusOutline class="size-4" aria-hidden="true" />
				{m.transfers_new()}
			</Button>
			<DeleteButton title={m.transfers_delete_title()}>{m.transfers_delete_text()}</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
	<div class="min-w-0">
		{#key data.transfer.id}
			<TransferForm
				player={{ value: data.transfer.playerId, label: playerName }}
				team={data.team}
				date={data.transfer.date}
				visible={data.transfer.visible}
				lockedPlayerId={data.transfer.playerId}
				{form}
				action="?/save"
				readonly={!canEdit}
				cancelHref={resolve('/(app)/transfers')}
			/>
		{/key}
	</div>
	{#if data.summary}
		<Timeline timeline={data.timeline} currentId={data.transfer.id} player={data.summary} />
	{/if}
</div>
