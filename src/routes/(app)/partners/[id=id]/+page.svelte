<script lang="ts">
	import { Alert, Badge } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import PartnerForm from '../PartnerForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'partners.edit'));
	const canDelete = $derived(can(data.user.permissions, 'partners.create'));
</script>

<PageHeader
	title={data.partner.name}
	back={resolve('/(app)/partners')}
	backLabel={m.partners_title()}
>
	{#snippet actions()}
		<Badge color="blue" large>
			{m.partners_clicks_total({ clicks: formatNumber(data.clicks, getLocale()) })}
		</Badge>
		{#if canDelete}
			<DeleteButton title={m.partners_delete_title({ name: data.partner.name })} />
		{/if}
	{/snippet}
</PageHeader>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<PartnerForm
	partner={data.partner}
	picture={data.picture}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/partners')}
/>
