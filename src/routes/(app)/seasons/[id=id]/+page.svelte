<script lang="ts">
	import { Alert, Badge, Button, Card, Heading } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { seasonLabel } from '#lib/seasons.ts';
	import SeasonForm from '../SeasonForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'seasons.edit'));
	const canDelete = $derived(can(data.user.permissions, 'seasons.create'));
	const canCreateGroup = $derived(can(data.user.permissions, 'game_groups.create'));
	const title = $derived(`${data.competition?.label ?? ''} · ${seasonLabel(data.season)}`);
</script>

<PageHeader {title} back={resolve('/(app)/seasons')} backLabel={m.nav_seasons()}>
	{#snippet actions()}
		{#if !data.season.visible}
			<Badge color="gray" large>{m.common_hidden()}</Badge>
		{/if}
		{#if canDelete && data.usage?.games}
			<!-- Games are never deleted from here: the season must be empty first. -->
			<Badge color="gray" large title={m.seasons_delete_has_games({ count: data.usage.games })}>
				{m.common_cannot_delete_games({ count: data.usage.games })}
			</Badge>
		{:else if canDelete}
			<DeleteButton title={m.seasons_delete_title({ season: title })}>
				{#if data.usage?.groups}
					<p class="font-medium text-red-700 dark:text-red-400">
						{m.seasons_delete_usage(data.usage)}
					</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

{#key data.season.id}
	<SeasonForm
		season={data.season}
		competition={data.competition}
		picture={data.picture}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/seasons')}
	/>
{/key}

<Card size="xl" class="mt-6 p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h2" class="text-lg font-medium">{m.nav_game_groups()}</Heading>
		{#if canCreateGroup}
			<Button
				size="sm"
				color="alternative"
				class="gap-2"
				href={`${resolve('/(app)/game-groups/new')}?season=${data.season.id}`}
			>
				<PlusOutline class="size-4" aria-hidden="true" />
				{m.game_groups_new()}
			</Button>
		{/if}
	</div>
	{#if data.groups.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.seasons_no_groups()}</p>
	{:else}
		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#each data.groups as group (group.id)}
				<li class="flex flex-wrap items-center justify-between gap-3 py-2.5">
					<a
						href={resolve('/(app)/game-groups/[id=id]', { id: group.id })}
						class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
					>
						{group.name || `#${group.id}`}
					</a>
					<span class="text-sm text-gray-500 dark:text-gray-400">
						{group.rulesName} · {m.game_groups_game_count({ count: group.games })}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</Card>
