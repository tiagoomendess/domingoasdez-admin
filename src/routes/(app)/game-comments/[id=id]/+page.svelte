<script lang="ts">
	import { Alert, Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import StatusBadge from '../StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'games.edit'));
	const canDelete = $derived(can(data.user.permissions, 'games.create'));
	const summary = $derived(data.summary);
	const dl = 'grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm';
</script>

<PageHeader
	title={m.game_comments_title_one({ id: data.comment.id })}
	back={resolve('/(app)/game-comments')}
	backLabel={m.nav_game_comments()}
>
	{#snippet actions()}
		<StatusBadge status={summary.status} large />
		{#if canDelete}
			<DeleteButton title={m.game_comments_delete_title({ id: data.comment.id })}>
				{m.game_comments_delete_text()}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if summary.status === 'used'}
	<Alert color="blue" class="mb-6">{m.game_comments_used_info()}</Alert>
{/if}
{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-3">
	<div class="xl:col-span-2">
		<EntityForm
			{form}
			action="?/save"
			readonly={!canEdit}
			cancelHref={resolve('/(app)/game-comments')}
		>
			<Card size="xl" class="space-y-5 p-6">
				<TextareaField
					name="content"
					label={m.game_comments_comment()}
					hint={m.game_comments_content_hint()}
					value={data.comment.content}
					maxlength={1000}
					rows={8}
				/>
				<TextField
					name="deadline"
					type="datetime-local"
					label={m.game_comments_deadline()}
					hint={m.game_comments_deadline_hint()}
					value={data.comment.deadline}
					required
				/>
			</Card>
		</EntityForm>
	</div>

	<Card size="xl" class="p-6">
		<Heading tag="h2" class="mb-4 text-lg font-medium">{m.game_comments_game()}</Heading>
		<dl class={dl}>
			<dt class="text-gray-500 dark:text-gray-400">{m.game_comments_game()}</dt>
			<dd>
				<a
					href={resolve('/(app)/games/[id=id]', { id: summary.gameId })}
					class="font-medium text-primary-700 hover:underline dark:text-primary-400"
					>{summary.homeClub} vs {summary.awayClub}</a
				>
				<span class="block text-xs text-gray-500 dark:text-gray-400"
					><DateTime value={summary.gameDate} /></span
				>
			</dd>
			<dt class="text-gray-500 dark:text-gray-400">{m.game_comments_team()}</dt>
			<dd class="text-gray-900 dark:text-white">
				{summary.teamClub} · {summary.teamName}
				<span class="block text-xs text-gray-500 dark:text-gray-400">
					{summary.side === 'home' ? m.game_comments_home() : m.game_comments_away()}
				</span>
			</dd>
			<dt class="text-gray-500 dark:text-gray-400">{m.game_comments_pin()}</dt>
			<dd class="font-mono text-gray-900 dark:text-white">{data.comment.pin}</dd>
			<dt class="text-gray-500 dark:text-gray-400">{m.game_comments_link()}</dt>
			<dd class="flex items-start gap-1">
				<code class="min-w-0 flex-1 text-xs break-all text-gray-700 dark:text-gray-300"
					>{data.link}</code
				>
				<CopyButton
					text={data.link}
					label={m.game_comments_copy_link()}
					copiedLabel={m.game_comments_link_copied()}
				/>
			</dd>
			<dt class="text-gray-500 dark:text-gray-400">{m.common_updated_at()}</dt>
			<dd class="text-gray-900 dark:text-white"><DateTime value={summary.updatedAt} /></dd>
		</dl>
	</Card>
</div>
