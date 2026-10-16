<script lang="ts">
	import { Alert } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import RulesForm from '../RulesForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'group_rules.edit'));
	const canDelete = $derived(can(data.user.permissions, 'group_rules.create'));
</script>

<PageHeader
	title={data.rules.name}
	back={resolve('/(app)/group-rules')}
	backLabel={m.nav_group_rules()}
>
	{#snippet actions()}
		{#if canDelete && data.groups === 0}
			<DeleteButton title={m.group_rules_delete_title({ name: data.rules.name })} />
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	{m.group_rules_used_by({ count: data.groups })}
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<!-- Remount for another rules page: the band editor keeps its own state. -->
{#key data.rules.id}
	<RulesForm
		rules={data.rules}
		positions={data.positions}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/group-rules')}
	/>
{/key}
