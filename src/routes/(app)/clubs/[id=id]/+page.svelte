<script lang="ts">
	import { Alert, Badge, Button, Card, Heading } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ClubForm from '../ClubForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'clubs.edit'));
	const canDelete = $derived(can(data.user.permissions, 'clubs.create'));
</script>

<PageHeader title={data.club.name} back={resolve('/(app)/clubs')} backLabel={m.clubs_title()}>
	{#snippet actions()}
		{#if canDelete}
			<DeleteButton title={m.clubs_delete_title({ name: data.club.name })}>
				{#if data.usage && (data.usage.teams || data.usage.playgrounds)}
					<p>
						{m.clubs_delete_cascade({
							teams: data.usage.teams,
							games: data.usage.games,
							playgrounds: data.usage.playgrounds
						})}
					</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<ClubForm
	club={data.club}
	emblem={data.emblem}
	adminUser={data.adminUser}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/clubs')}
/>

<Card size="xl" class="mt-6 p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<Heading tag="h2" class="w-auto text-lg font-medium">
			{m.clubs_teams()}
			<span class="text-gray-500 dark:text-gray-400">({data.teams.length})</span>
		</Heading>
		{#if can(data.user.permissions, 'teams.create')}
			<Button
				href={resolve(`/(app)/teams/new?club=${data.club.id}`)}
				size="sm"
				color="alternative"
				class="gap-2"
			>
				<PlusOutline class="size-4" aria-hidden="true" />
				{m.teams_new()}
			</Button>
		{/if}
	</div>
	{#if data.teams.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">{m.clubs_no_teams()}</p>
	{:else}
		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#each data.teams as team (team.id)}
				<li class="flex items-center gap-2 py-2">
					{#if can(data.user.permissions, 'teams')}
						<a
							href={resolve('/(app)/teams/[id=id]', { id: team.id })}
							class="text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{team.name}
						</a>
					{:else}
						<span class="text-gray-900 dark:text-white">{team.name}</span>
					{/if}
					{#if !team.visible}
						<Badge color="gray">{m.common_hidden()}</Badge>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Card>
