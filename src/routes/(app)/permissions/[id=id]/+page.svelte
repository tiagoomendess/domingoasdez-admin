<script lang="ts">
	import { Alert, Badge, Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'permissions.edit'));
	const canDelete = $derived(can(data.user.permissions, 'permissions.create'));
	/** A name the code checks can't be renamed: its holders would lose the section. */
	const nameLocked = $derived(data.usedByCode);
</script>

<PageHeader
	title={data.permission.name}
	back={resolve('/(app)/permissions')}
	backLabel={m.nav_permissions()}
>
	{#snippet actions()}
		{#if data.usedByCode}
			<Badge color="blue" large>{m.permissions_used_by_code()}</Badge>
		{/if}
		{#if canDelete && data.locked}
			<Badge color="gray" large title={m.permissions_delete_locked()}>
				{m.permissions_cannot_delete()}
			</Badge>
		{:else if canDelete}
			<DeleteButton title={m.permissions_delete_title({ name: data.permission.name })}>
				{#if data.holders.length}
					<p class="font-medium text-red-700 dark:text-red-400">
						{m.permissions_delete_holders({ count: data.holders.length })}
					</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	#{data.permission.id}
	{#if data.permission.updatedAt}
		· {m.common_updated_at()} <DateTime value={data.permission.updatedAt} />
	{/if}
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-3">
	<div class="xl:col-span-2">
		<EntityForm
			{form}
			action="?/save"
			readonly={!canEdit || nameLocked}
			cancelHref={resolve('/(app)/permissions')}
		>
			<Card size="xl" class="p-6">
				<TextField
					name="name"
					label={m.common_name()}
					hint={nameLocked ? m.permissions_rename_locked() : m.permissions_name_hint()}
					value={data.permission.name}
					required
					maxlength={100}
					autocomplete="off"
				/>
			</Card>
		</EntityForm>
	</div>

	<Card size="xl" class="p-6">
		<Heading tag="h2" class="mb-3 text-lg font-medium">
			{m.permissions_holders({ count: data.holders.length })}
		</Heading>
		{#if data.holders.length === 0}
			<p class="text-sm text-gray-600 dark:text-gray-400">{m.permissions_no_holders()}</p>
		{:else}
			<ul class="divide-y divide-gray-100 text-sm dark:divide-gray-700">
				{#each data.holders as holder (holder.id)}
					<li class="py-2">
						{#if data.canSeeUsers}
							<a
								href={resolve('/(app)/users/[id=id]', { id: holder.id })}
								class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
								>{holder.name || holder.email}</a
							>
						{:else}
							<span class="font-medium text-gray-900 dark:text-white"
								>{holder.name || holder.email}</span
							>
						{/if}
						<span class="block text-xs text-gray-500 dark:text-gray-400">{holder.email}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-3 text-xs text-gray-500 dark:text-gray-400">{m.permissions_holders_hint()}</p>
		{/if}
	</Card>
</div>
