<script lang="ts">
	import { A, Alert, Button, Card } from 'flowbite-svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PostForm from '../PostForm.svelte';
	import StatusBadge from '../StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'social_media_posts.edit'));
	const canDelete = $derived(can(data.user.permissions, 'social_media_posts.create'));
	const retryable = $derived(data.status === 'failed' || data.status === 'missed');
	const facebookUrl = $derived(
		data.post.platform === 'facebook' && data.post.postId
			? `https://www.facebook.com/${data.post.postId}`
			: null
	);
</script>

<PageHeader
	title={m.social_posts_heading({ id: data.post.id })}
	back={resolve('/(app)/social-media-posts')}
	backLabel={m.social_posts_title()}
>
	{#snippet actions()}
		{#if canDelete}
			<DeleteButton title={m.social_posts_delete_title({ id: data.post.id })}>
				{#if data.post.published}<p>{m.social_posts_delete_published()}</p>{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<Card size="xl" class="mb-6 max-w-3xl p-6">
	<dl class="grid gap-4 text-sm sm:grid-cols-2">
		<div>
			<dt class="text-gray-500 dark:text-gray-400">{m.social_posts_status()}</dt>
			<dd class="mt-1"><StatusBadge status={data.status} large /></dd>
		</div>
		<div>
			<dt class="text-gray-500 dark:text-gray-400">{m.common_updated_at()}</dt>
			<dd class="mt-1 text-gray-900 dark:text-white"><DateTime value={data.post.updatedAt} /></dd>
		</div>
		{#if data.post.postId}
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.social_posts_post_id()}</dt>
				<dd class="mt-1 font-mono break-all text-gray-900 dark:text-white">
					{#if facebookUrl}
						<A
							href={facebookUrl}
							target="_blank"
							rel="noopener noreferrer"
							title={m.social_posts_view_facebook()}>{data.post.postId}</A
						>
					{:else}
						{data.post.postId}
					{/if}
				</dd>
			</div>
		{/if}
		{#if data.post.mediaExternalId}
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.social_posts_prepared_id()}</dt>
				<dd class="mt-1 font-mono break-all text-gray-900 dark:text-white">
					{data.post.mediaExternalId}
				</dd>
			</div>
		{/if}
	</dl>

	{#if data.post.errorMessage}
		{@const earlier = data.status === 'published'}
		<!-- Published anyway: the error is from an attempt before the one that succeeded. -->
		<Alert color={earlier ? 'yellow' : 'red'} class="mt-4">
			<span class="font-medium"
				>{earlier ? m.social_posts_error_earlier() : m.social_posts_error()}:</span
			>
			{data.post.errorMessage}
		</Alert>
	{/if}

	{#if retryable && canEdit}
		<form method="POST" action="?/retry" use:enhance class="mt-4 flex items-center gap-3">
			<Button type="submit" color="alternative">{m.social_posts_retry()}</Button>
			<span class="text-sm text-gray-500 dark:text-gray-400">{m.social_posts_retry_hint()}</span>
		</form>
	{/if}
</Card>

{#if data.post.published && data.status === 'failed'}
	<!-- Marked done after a failure (no answer from Facebook, or legacy): not tried again. -->
	<Alert color="yellow" class="mb-6">{m.social_posts_not_retried()}</Alert>
{:else if data.post.published}
	<Alert color="blue" class="mb-6">{m.social_posts_not_editable()}</Alert>
{:else if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<PostForm
	post={{ ...data.post, publishAt: data.publishAt }}
	{form}
	action="?/save"
	readonly={data.post.published || !canEdit}
	cancelHref={resolve('/(app)/social-media-posts')}
/>
