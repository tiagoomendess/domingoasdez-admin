<script lang="ts">
	import { Alert, Badge } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PlaygroundForm from '../PlaygroundForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'playgrounds.edit'));
	const canDelete = $derived(can(data.user.permissions, 'playgrounds.create'));
</script>

<PageHeader
	title={data.playground.name}
	back={resolve('/(app)/playgrounds')}
	backLabel={m.nav_playgrounds()}
>
	{#snippet actions()}
		{#if !data.playground.visible}
			<Badge color="gray" large>{m.common_hidden()}</Badge>
		{/if}
		{#if canDelete && data.games}
			<!-- Deleting it would delete the games played there (the foreign key cascades). -->
			<Badge color="gray" large title={m.playgrounds_delete_has_games({ count: data.games })}>
				{m.common_cannot_delete_games({ count: data.games })}
			</Badge>
		{:else if canDelete}
			<DeleteButton title={m.playgrounds_delete_title({ name: data.playground.name })} />
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	#{data.playground.id} · {m.game_groups_game_count({ count: data.games })} · {m.common_updated_at()}
	<DateTime value={data.playground.updatedAt} />
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

{#key data.playground.id}
	<PlaygroundForm
		playground={data.playground}
		club={data.club}
		picture={data.picture}
		surfaces={data.surfaces}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/playgrounds')}
	/>
{/key}
