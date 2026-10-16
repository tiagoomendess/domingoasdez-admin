<script lang="ts">
	import {
		Alert,
		Badge,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import { describeVariable } from './descriptions';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Row = (typeof data.general)[number];
</script>

{#snippet table(rows: Row[])}
	<Table hoverable shadow>
		<TableHead>
			<TableHeadCell>{m.settings_name()}</TableHeadCell>
			<TableHeadCell class="w-2/5">{m.settings_value()}</TableHeadCell>
			<TableHeadCell class="w-44">{m.common_updated_at()}</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each rows as row (row.name)}
				{@const description = describeVariable(row.name)}
				<TableBodyRow>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/settings/[name=variable]', { name: row.name })}
							class="font-mono text-sm font-medium break-all text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
							>{row.name}</a
						>
						{#if description}
							<span class="block text-xs text-gray-500 dark:text-gray-400">{description}</span>
						{:else}
							<Badge color="gray" class="mt-1">{m.settings_not_used()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="max-w-0 whitespace-normal">
						{#if row.kind === 'secret'}
							<span class="font-mono text-gray-500 dark:text-gray-400">••••••••</span>
						{:else if row.kind === 'image'}
							<div class="flex items-center gap-3">
								<img
									src={row.value}
									alt=""
									class="size-12 shrink-0 rounded-sm border border-gray-200 object-cover dark:border-gray-700"
									loading="lazy"
								/>
								<span class="truncate text-xs text-gray-600 dark:text-gray-400" title={row.value}
									>{row.value}</span
								>
							</div>
						{:else if row.kind === 'game'}
							{m.settings_game_value({ id: row.value ?? '' })}
						{:else}
							<span class="line-clamp-2 break-words text-gray-900 tabular-nums dark:text-white"
								>{row.value}</span
							>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="text-gray-600 dark:text-gray-400">
						{#if row.updatedAt}<DateTime value={row.updatedAt} />{:else}–{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/snippet}

<PageHeader title={m.nav_settings()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/settings/new')}
			label={m.settings_new()}
			granted={data.user.permissions}
			permission="admin"
		/>
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{m.settings_intro()}</p>

{#if data.missing.length}
	<Alert color="yellow" class="mb-6">
		<p class="font-medium">{m.settings_missing_title({ count: data.missing.length })}</p>
		<p class="mt-1 mb-3 text-sm">{m.settings_missing_text()}</p>
		<div class="flex flex-wrap gap-2">
			{#each data.missing as name (name)}
				<a
					href={resolvePath(`/settings/new?${new URLSearchParams({ name })}`)}
					class="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-white px-2.5 py-1 font-mono text-xs text-gray-900 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
				>
					<PlusOutline class="size-3.5" aria-hidden="true" />
					{name}
				</a>
			{/each}
		</div>
	</Alert>
{/if}

<div class="mb-4">
	<ListSearch q={data.q} placeholder={m.settings_search_placeholder()} />
</div>

{#if !data.general.length && !data.socialMedia.length}
	<EmptyState q={data.q} message={m.settings_empty()} />
{:else}
	{#if data.general.length}
		<section class="mb-8">
			<Heading tag="h2" class="mb-3 text-lg font-medium">{m.settings_group_general()}</Heading>
			{@render table(data.general)}
		</section>
	{/if}
	{#if data.socialMedia.length}
		<section>
			<Heading tag="h2" class="mb-1 text-lg font-medium">{m.settings_group_social()}</Heading>
			<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">{m.settings_group_social_hint()}</p>
			{@render table(data.socialMedia)}
		</section>
	{/if}
{/if}
