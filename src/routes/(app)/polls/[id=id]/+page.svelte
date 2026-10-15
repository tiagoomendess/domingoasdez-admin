<script lang="ts">
	import { Alert, Button, Card, Heading } from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { PUBLIC_FRONTEND_URL } from '$app/env/public';
	import { can } from '#lib/auth/permissions.ts';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import CopyLinkButton from '../CopyLinkButton.svelte';
	import PollForm from '../PollForm.svelte';
	import PollStatusBadge from '../PollStatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'polls.edit'));
	const canDelete = $derived(can(data.user.permissions, 'polls.create'));
	const publicUrl = $derived(`${PUBLIC_FRONTEND_URL}/sondagens/${data.poll.slug}`);
	const votes = $derived(data.answers.reduce((sum, answer) => sum + answer.votes, 0));
</script>

<PageHeader title={data.poll.question} back={resolve('/(app)/polls')} backLabel={m.polls_title()}>
	{#snippet actions()}
		<PollStatusBadge status={data.status} large />
		{#if data.poll.visible}
			<Button
				href={publicUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.polls_open_public()}
			</Button>
		{/if}
		{#if canDelete}
			<DeleteButton title={m.polls_delete_title({ id: data.poll.id })}>
				{m.polls_delete_text({ votes: formatNumber(votes, getLocale()) })}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 flex flex-wrap items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
	/sondagens/{data.poll.slug}
	<CopyLinkButton url={publicUrl} />
	· {m.common_updated_at()}
	<DateTime value={data.poll.updatedAt} />
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<PollForm
	poll={data.poll}
	results={data.answers}
	publishLocked={data.publishLocked}
	publishedAt={data.poll.publishedAt}
	{form}
	action="?/save"
	readonly={!canEdit}
	cancelHref={resolve('/(app)/polls')}
/>

<Card size="xl" class="mt-6 p-6">
	<Heading tag="h2" class="mb-1 text-lg font-medium">{m.polls_image()}</Heading>
	<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
		{data.poll.updateImage ? m.polls_image_pending() : m.polls_image_hint()}
	</p>
	<img
		src={data.image}
		alt={m.polls_image_alt({ question: data.poll.question })}
		class="aspect-video w-full max-w-xl rounded-lg object-cover"
	/>
</Card>
