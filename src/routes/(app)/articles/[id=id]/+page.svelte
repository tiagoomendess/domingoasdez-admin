<script lang="ts">
	import { Alert, Badge, Button } from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline, FacebookSolid } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ArticleForm from '../ArticleForm.svelte';
	import FacebookPostButton from '../FacebookPostButton.svelte';
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
		{:else}
			<Button
				href={data.publicUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.players_open_public()}
			</Button>
		{/if}
		{#if data.facebookPostUrl}
			<Button
				href={data.facebookPostUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<FacebookSolid class="size-4 text-[#1877f2] dark:text-white" aria-hidden="true" />
				{m.articles_facebook_open()}
			</Button>
		{:else if data.canPostOnFacebook}
			<FacebookPostButton article={data.article} />
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

{#if data.facebookPostUrl}
	<!-- The link goes in the post's comments by hand: Graph API comments need permissions the page lacks. -->
	<div
		class="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<span class="text-gray-700 dark:text-gray-300">{m.articles_facebook_comment_link()}</span>
		<span class="flex min-w-0 items-center gap-1">
			<code class="truncate text-gray-900 dark:text-white">{data.publicUrl}</code>
			<CopyButton
				text={data.publicUrl}
				label={m.articles_copy_link()}
				copiedLabel={m.articles_link_copied()}
			/>
		</span>
	</div>
{/if}

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
