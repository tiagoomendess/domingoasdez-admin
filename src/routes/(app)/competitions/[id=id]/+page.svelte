<script lang="ts">
	import { Alert, Badge, Button, Card, Heading } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { seasonYears } from '#lib/seasons.ts';
	import CompetitionForm from '../CompetitionForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'competitions.edit'));
	const canDelete = $derived(can(data.user.permissions, 'competitions.create'));
	const canCreateSeason = $derived(can(data.user.permissions, 'seasons.create'));
</script>

<PageHeader
	title={data.competition.name}
	back={resolve('/(app)/competitions')}
	backLabel={m.nav_competitions()}
>
	{#snippet actions()}
		{#if !data.competition.visible}
			<Badge color="gray" large>{m.common_hidden()}</Badge>
		{/if}
		{#if canDelete && data.usage?.games}
			<!-- Games are never deleted from here: the competition must be empty first. -->
			<Badge
				color="gray"
				large
				title={m.competitions_delete_has_games({ count: data.usage.games })}
			>
				{m.common_cannot_delete_games({ count: data.usage.games })}
			</Badge>
		{:else if canDelete}
			<DeleteButton title={m.competitions_delete_title({ name: data.competition.name })}>
				{#if data.usage?.seasons}
					<p class="font-medium text-red-700 dark:text-red-400">
						{m.competitions_delete_usage(data.usage)}
					</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<CompetitionForm
	competition={data.competition}
	picture={data.picture}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/competitions')}
/>

<Card size="xl" class="mt-6 p-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h2" class="text-lg font-medium">{m.nav_seasons()}</Heading>
		{#if canCreateSeason}
			<Button
				size="sm"
				color="alternative"
				class="gap-2"
				href={`${resolve('/(app)/seasons/new')}?competition=${data.competition.id}`}
			>
				<PlusOutline class="size-4" aria-hidden="true" />
				{m.seasons_new()}
			</Button>
		{/if}
	</div>
	{#if data.seasons.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.competitions_no_seasons()}</p>
	{:else}
		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#each data.seasons as season (season.id)}
				<li class="flex items-center justify-between gap-3 py-2.5">
					<a
						href={resolve('/(app)/seasons/[id=id]', { id: season.id })}
						class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
					>
						{seasonYears(season.startYear, season.endYear)}
						{#if season.name}
							<span class="font-normal text-gray-500 dark:text-gray-400">· {season.name}</span>
						{/if}
					</a>
					<span class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						{#if !season.visible}<Badge color="gray">{m.common_hidden()}</Badge>{/if}
						{m.seasons_group_count({ count: season.groups })}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</Card>
