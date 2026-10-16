<script lang="ts">
	import { Alert, Badge } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import GroupForm from '../GroupForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'game_groups.edit'));
	const canDelete = $derived(can(data.user.permissions, 'game_groups.create'));
	const name = $derived(data.group.name || `#${data.group.id}`);
	const linkClass = 'font-medium text-primary-700 hover:underline dark:text-primary-400';
</script>

<PageHeader title={name} back={resolve('/(app)/game-groups')} backLabel={m.nav_game_groups()}>
	{#snippet actions()}
		{#if canDelete && data.games}
			<!-- Games are never deleted from here: the group must be empty first. -->
			<Badge color="gray" large title={m.game_groups_delete_has_games({ count: data.games })}>
				{m.common_cannot_delete_games({ count: data.games })}
			</Badge>
		{:else if canDelete}
			<DeleteButton title={m.game_groups_delete_title({ name })} />
		{/if}
	{/snippet}
</PageHeader>

<!-- Where the group sits: its season and rules, and how many games it has. -->
<p class="-mt-4 mb-6 flex flex-wrap gap-x-2 text-sm text-gray-500 dark:text-gray-400">
	{#if data.season}
		{#if data.canSeeSeason}
			<a href={resolve('/(app)/seasons/[id=id]', { id: data.group.seasonId })} class={linkClass}
				>{data.season.label}</a
			>
		{:else}
			<span>{data.season.label}</span>
		{/if}
		<span aria-hidden="true">·</span>
	{/if}
	{#if data.rules}
		{#if data.canSeeRules}
			<a
				href={resolve('/(app)/group-rules/[id=id]', { id: data.group.groupRulesId })}
				class={linkClass}>{data.rules.label}</a
			>
		{:else}
			<span>{data.rules.label}</span>
		{/if}
		<span aria-hidden="true">·</span>
	{/if}
	<a href={resolvePath(`/games?group=${data.group.id}`)} class={linkClass}
		>{m.game_groups_game_count({ count: data.games })}</a
	>
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

{#key data.group.id}
	<GroupForm
		name={data.group.name ?? ''}
		season={data.season}
		rules={data.rules}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/game-groups')}
	/>
{/key}
