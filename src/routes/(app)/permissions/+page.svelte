<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canCreate = $derived(can(data.user.permissions, 'permissions.create'));
	let creating = $state<string | null>(null);
</script>

<PageHeader title={m.nav_permissions()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/permissions/new')}
			label={m.permissions_new()}
			granted={data.user.permissions}
			permission="permissions.create"
		/>
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">{m.permissions_intro()}</p>

{#if data.missing.length}
	<!-- Names the admin checks with no row: only full admins can use those sections today. -->
	<Alert color="yellow" class="mb-6">
		<p class="font-medium">{m.permissions_missing_title({ count: data.missing.length })}</p>
		<p class="mt-1 mb-3 text-sm">{m.permissions_missing_text()}</p>
		{#if form && 'message' in form && form.message}
			<p class="mb-2 text-sm text-red-700 dark:text-red-400">{form.message}</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			{#each data.missing as name (name)}
				{#if canCreate}
					<form
						method="POST"
						action="?/createMissing"
						use:enhance={() => {
							creating = name;
							return async ({ update }) => {
								await update();
								creating = null;
							};
						}}
					>
						<input type="hidden" name="name" value={name} />
						<Button
							type="submit"
							size="xs"
							color="alternative"
							class="gap-1.5"
							loading={creating === name}
							title={m.permissions_create_name({ name })}
						>
							{#if creating !== name}<PlusOutline class="size-3.5" aria-hidden="true" />{/if}
							<code>{name}</code>
						</Button>
					</form>
				{:else}
					<code class="rounded-sm bg-yellow-100 px-1.5 py-0.5 text-xs dark:bg-yellow-900/40"
						>{name}</code
					>
				{/if}
			{/each}
		</div>
	</Alert>
{/if}

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.permissions_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.permissions_empty()} />
{:else}
	<Table hoverable shadow>
		<TableHead>
			<SortHeader state={data.list} column="id" label={m.common_id()} class="w-20" />
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader
				state={data.list}
				column="users"
				label={m.permissions_users()}
				defaultDir="desc"
				class="w-32"
			/>
			<TableHeadCell class="w-56"
				><span class="sr-only">{m.permissions_usage()}</span></TableHeadCell
			>
		</TableHead>
		<TableBody>
			{#each data.rows as permission (permission.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{permission.id}</TableBodyCell
					>
					<TableBodyCell>
						<a
							href={resolve('/(app)/permissions/[id=id]', { id: permission.id })}
							class="font-mono text-sm font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{permission.name}
						</a>
					</TableBodyCell>
					<TableBodyCell class="tabular-nums">{permission.users}</TableBodyCell>
					<TableBodyCell>
						{#if !permission.usedByCode}
							<Badge color="gray" title={m.permissions_not_used_hint()}
								>{m.permissions_not_used()}</Badge
							>
						{/if}
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
