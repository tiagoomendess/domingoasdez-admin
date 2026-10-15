<script lang="ts">
	import { Alert, Badge, Button } from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { PUBLIC_FRONTEND_URL } from '$app/env/public';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PageForm from '../PageForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'pages.edit'));
	const canDelete = $derived(can(data.user.permissions, 'pages.create'));
	const publicUrl = $derived(`${PUBLIC_FRONTEND_URL}/p/${data.page.slug}`);
</script>

<PageHeader title={data.page.title} back={resolve('/(app)/pages')} backLabel={m.pages_title()}>
	{#snippet actions()}
		{#if data.page.visible}
			<Button
				href={publicUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.pages_open_public()}
			</Button>
		{:else}
			<Badge color="gray" large>{m.common_hidden()}</Badge>
		{/if}
		{#if canDelete}
			<DeleteButton title={m.pages_delete_title({ title: data.page.title })} />
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	/p/{data.page.slug} · {m.common_updated_at()}
	<DateTime value={data.page.updatedAt} />
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<!-- The editor owns its content once mounted: start a fresh one for another page. -->
{#key data.page.id}
	<PageForm
		page={data.page}
		picture={data.picture}
		canUpload={can(data.user.permissions, 'media')}
		{form}
		action="?/save"
		readonly={!canEdit}
		cancelHref={resolve('/(app)/pages')}
	/>
{/key}
