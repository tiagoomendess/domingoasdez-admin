<script lang="ts">
	import { Alert, Badge } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ArticleForm from '../ArticleForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader
	title={data.article.title}
	back={resolve('/(app)/articles')}
	backLabel={m.articles_title()}
>
	{#snippet actions()}
		{#if !data.article.visible}
			<Badge color="gray" large>{m.common_hidden()}</Badge>
		{/if}
		{#if data.canDelete}
			<DeleteButton title={m.articles_delete_title({ title: data.article.title })} />
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	{m.articles_byline({ author: data.author ?? '—' })} ·
	{m.common_updated_at()}
	<DateTime value={data.article.updatedAt} />
</p>

{#if !data.canEdit}
	<Alert color="blue" class="mb-6">
		{can(data.user.permissions, 'articles.edit') ? m.articles_not_owner() : m.form_read_only()}
	</Alert>
{/if}

<!-- The editor owns its content once mounted: start a fresh one for another article. -->
{#key data.article.id}
	<ArticleForm
		article={data.article}
		cover={data.cover}
		canUpload={can(data.user.permissions, 'media')}
		{form}
		action="?/save"
		readonly={!data.canEdit}
		cancelHref={resolve('/(app)/articles')}
	/>
{/key}
