<script lang="ts">
	import { Alert, Badge, Button, Card, Heading } from 'flowbite-svelte';
	import { EyeOutline } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { describeVariable } from '../descriptions';
	import ValueField from '../ValueField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const description = $derived(describeVariable(data.variable.name));
	const revealed = $derived(form && 'revealed' in form ? form.revealed : null);
	let revealing = $state(false);
</script>

<PageHeader
	title={data.variable.name}
	back={resolve('/(app)/settings')}
	backLabel={m.nav_settings()}
>
	{#snippet actions()}
		{#if data.variable.usedByCode}
			<Badge color="gray" large title={m.settings_delete_locked()}>
				{m.settings_used_by_code()}
			</Badge>
		{:else}
			<DeleteButton title={m.settings_delete_title({ name: data.variable.name })} />
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	{description ?? m.settings_not_used_hint()}
	{#if data.variable.updatedAt}
		· {m.common_updated_at()} <DateTime value={data.variable.updatedAt} />
	{/if}
</p>

{#if data.variable.kind === 'secret'}
	<Alert color="blue" class="mb-6 max-w-3xl">{m.settings_secret_alert()}</Alert>
	<Card size="xl" class="mb-6 max-w-3xl p-6">
		<Heading tag="h2" class="mb-3 text-lg font-medium">{m.settings_current_value()}</Heading>
		{#if revealed}
			<div class="flex items-center gap-2">
				<code class="rounded-sm bg-gray-100 px-2 py-1 font-mono text-sm break-all dark:bg-gray-700"
					>{revealed}</code
				>
				<CopyButton
					text={revealed}
					label={m.settings_copy_value()}
					copiedLabel={m.settings_value_copied()}
				/>
			</div>
		{:else}
			<form
				method="POST"
				action="?/reveal"
				use:enhance={() => {
					revealing = true;
					return async ({ update }) => {
						await update({ reset: false });
						revealing = false;
					};
				}}
			>
				<Button type="submit" color="alternative" size="sm" class="gap-2" loading={revealing}>
					{#if !revealing}<EyeOutline class="size-4" aria-hidden="true" />{/if}
					{m.settings_reveal()}
				</Button>
				<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{m.settings_reveal_hint()}</p>
			</form>
		{/if}
	</Card>
{/if}

{#key data.variable.updatedAt}
	<EntityForm {form} action="?/save" cancelHref={resolve('/(app)/settings')}>
		<Card size="xl" class="max-w-3xl p-6">
			<ValueField kind={data.variable.kind} value={data.variable.value} game={data.game} />
		</Card>
	</EntityForm>
{/key}
