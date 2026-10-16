<script lang="ts">
	import { A, Alert, Button, Card, Heading } from 'flowbite-svelte';
	import {
		ArchiveOutline,
		ArrowRightOutline,
		CheckCircleOutline,
		EyeOutline,
		EyeSlashOutline
	} from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import StatusBadge from '../StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let submitting = $state<string | null>(null);

	const actions = {
		used: {
			label: m.info_reports_mark_used,
			color: 'green',
			icon: CheckCircleOutline
		},
		archived: {
			label: m.info_reports_mark_archived,
			color: 'alternative',
			icon: ArchiveOutline
		},
		seen: { label: m.info_reports_mark_seen, color: 'alternative', icon: EyeOutline },
		sent: { label: m.info_reports_mark_unread, color: 'alternative', icon: EyeSlashOutline }
	} as const;

	/** The usual decisions first. */
	const ORDER = ['used', 'archived', 'seen', 'sent'] as const;
	const choices = $derived(
		ORDER.filter((status) => data.statuses.includes(status) && status !== data.report.status)
	);
</script>

<PageHeader
	title={m.info_reports_title({ code: data.report.code })}
	back={resolve('/(app)/info-reports')}
	backLabel={m.nav_info_reports()}
>
	{#snippet actions()}
		<StatusBadge status={data.report.status} large />
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	#{data.report.id} · {m.info_reports_received()}
	<DateTime value={data.report.createdAt} />
	· {m.info_reports_open_count({ count: data.openTotal })}
</p>

{#if data.report.status === 'deleted'}
	<Alert color="red" class="mb-6">{m.info_reports_deleted_hint()}</Alert>
{/if}
{#if !data.canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-3">
	<div class="space-y-6 xl:col-span-2">
		<Card size="xl" class="p-6">
			<Heading tag="h2" class="mb-3 text-lg font-medium">{m.info_reports_content()}</Heading>
			<p class="text-base break-words whitespace-pre-line text-gray-900 dark:text-white">
				{data.report.content}
			</p>
			<Heading tag="h3" class="mt-6 mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
				{m.info_reports_source()}
			</Heading>
			{#if data.report.sourceUrl}
				<A href={data.report.sourceUrl} target="_blank" rel="noopener noreferrer" class="break-all"
					>{data.report.source}</A
				>
			{:else}
				<p class="break-words text-gray-900 dark:text-white">{data.report.source}</p>
			{/if}
		</Card>

		{#if data.canEdit}
			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.info_reports_decide()}</Heading>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					{data.nextId ? m.info_reports_decide_next() : m.info_reports_decide_last()}
				</p>
				<div class="flex flex-wrap gap-3">
					{#each choices as status (status)}
						{@const action = actions[status]}
						<form
							method="POST"
							action="?/status"
							use:enhance={() => {
								submitting = status;
								return async ({ update }) => {
									await update();
									submitting = null;
								};
							}}
						>
							<input type="hidden" name="status" value={status} />
							<Button
								type="submit"
								color={action.color}
								class="gap-2"
								loading={submitting === status}
								disabled={submitting !== null}
							>
								{#if submitting !== status}<action.icon class="size-4" aria-hidden="true" />{/if}
								{action.label()}
							</Button>
						</form>
					{/each}
					{#if data.nextId}
						<Button
							href={resolve('/(app)/info-reports/[id=id]', { id: data.nextId })}
							color="light"
							class="ms-auto gap-2"
							data-sveltekit-preload-data="tap"
						>
							{m.info_reports_skip()}
							<ArrowRightOutline class="size-4" aria-hidden="true" />
						</Button>
					{/if}
				</div>
			</Card>
		{/if}
	</div>

	<Card size="xl" class="p-6">
		<dl class="space-y-4 text-sm">
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.info_reports_code()}</dt>
				<dd class="flex items-center gap-2 font-mono text-gray-900 dark:text-white">
					{data.report.code}
					<CopyButton
						text={data.report.code}
						label={m.info_reports_copy_code()}
						copiedLabel={m.info_reports_code_copied()}
					/>
				</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.info_reports_author()}</dt>
				<dd class="text-gray-900 dark:text-white">
					{#if !data.author}
						{m.info_reports_anonymous()}
					{:else if data.canSeeUsers}
						<a
							href={resolve('/(app)/users/[id=id]', { id: data.author.id })}
							class="font-medium hover:text-primary-700 hover:underline dark:hover:text-primary-400"
							>{data.author.name}</a
						>
						<span class="block text-xs text-gray-500 dark:text-gray-400">{data.author.email}</span>
					{:else}
						{data.author.name}
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.info_reports_received()}</dt>
				<dd class="text-gray-900 dark:text-white"><DateTime value={data.report.createdAt} /></dd>
			</div>
			{#if data.report.updatedAt}
				<div>
					<dt class="text-gray-500 dark:text-gray-400">{m.common_updated_at()}</dt>
					<dd class="text-gray-900 dark:text-white">
						<DateTime value={data.report.updatedAt} />
					</dd>
				</div>
			{/if}
		</dl>
	</Card>
</div>
