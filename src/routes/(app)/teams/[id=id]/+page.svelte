<script lang="ts">
	import { Alert } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import TeamForm from '../TeamForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'teams.edit'));
	const canDelete = $derived(can(data.user.permissions, 'teams.create'));
	const title = $derived(data.club ? `${data.team.name} · ${data.club.label}` : data.team.name);
</script>

<PageHeader {title} back={resolve('/(app)/teams')} backLabel={m.teams_title()}>
	{#snippet actions()}
		{#if canDelete}
			<DeleteButton title={m.teams_delete_title({ name: data.team.name })}>
				{#if data.usage && (data.usage.games || data.usage.players)}
					<p>{m.teams_delete_cascade({ games: data.usage.games, players: data.usage.players })}</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<TeamForm
	team={data.team}
	club={data.club}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/teams')}
/>
