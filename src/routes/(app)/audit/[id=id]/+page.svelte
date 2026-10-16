<script lang="ts">
	import { Button, Card, Heading, Toggle } from 'flowbite-svelte';
	import { ArrowUpRightFromSquareOutline, ClockOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resolvePath } from '#lib/paths.ts';
	import ActionBadge from '../ActionBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const isUpdate = $derived(data.entry.action === 'update');
	const changedCount = $derived(data.diff.filter((row) => row.changed).length);
	/** An update lists only what changed; creates and deletes have one side, so show it all. */
	let showAll = $state(false);
	const rows = $derived(isUpdate && !showAll ? data.diff.filter((row) => row.changed) : data.diff);

	const historyHref = $derived(
		data.entry.model && data.entry.modelId
			? resolvePath(
					`/audit?${new URLSearchParams({ model: data.entry.model, model_id: String(data.entry.modelId) })}`
				)
			: null
	);

	const details = $derived([
		{ label: m.audit_ip(), value: data.entry.ipAddress },
		{ label: m.audit_country(), value: data.entry.ipCountry },
		{ label: m.audit_user_agent(), value: data.entry.userAgent },
		{ label: m.audit_timezone(), value: data.entry.timezone },
		{ label: m.audit_language(), value: data.entry.language },
		{ label: m.audit_extra_info(), value: data.entry.extraInfo }
	]);
</script>

{#snippet value(text: string | null | undefined, tone: 'old' | 'new' | null)}
	{#if text === undefined}
		<span class="text-gray-400 dark:text-gray-500">–</span>
	{:else if text === null}
		<span class="text-gray-400 italic dark:text-gray-500">null</span>
	{:else}
		<pre
			class={[
				'max-h-64 overflow-auto rounded-sm px-1.5 py-0.5 font-mono text-xs break-all whitespace-pre-wrap',
				tone === 'old' && 'bg-red-50 text-red-900 dark:bg-red-900/30 dark:text-red-200',
				tone === 'new' && 'bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200',
				!tone && 'text-gray-700 dark:text-gray-300'
			]}>{text}</pre>
	{/if}
{/snippet}

{#snippet raw(title: string, text: string)}
	<Card size="xl" class="p-6">
		<Heading tag="h2" class="mb-1 text-lg font-medium">{title}</Heading>
		<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">{m.audit_raw_hint()}</p>
		<pre
			class="max-h-96 overflow-auto font-mono text-xs break-all whitespace-pre-wrap text-gray-700 dark:text-gray-300">{text}</pre>
	</Card>
{/snippet}

<PageHeader
	title={m.audit_entry_title({ id: data.entry.id })}
	back={resolve('/(app)/audit')}
	backLabel={m.nav_audit()}
>
	{#snippet actions()}
		<ActionBadge action={data.entry.action} large />
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	<DateTime value={data.entry.createdAt} />
	{#if data.entry.model}
		· {data.entry.model}{data.entry.modelId ? ` #${data.entry.modelId}` : ''}
	{/if}
</p>

{#if data.entityPath || historyHref}
	<div class="mb-6 flex flex-wrap gap-3">
		{#if data.entityPath}
			<Button href={resolvePath(data.entityPath)} color="alternative" size="sm" class="gap-2">
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.audit_open_entity()}
			</Button>
		{/if}
		{#if historyHref}
			<Button href={historyHref} color="alternative" size="sm" class="gap-2">
				<ClockOutline class="size-4" aria-hidden="true" />
				{m.audit_history()}
			</Button>
		{/if}
	</div>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-3">
	<div class="min-w-0 space-y-6 xl:col-span-2">
		{#if data.diff.length}
			<Card size="xl" class="p-6">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<Heading tag="h2" class="w-auto text-lg font-medium">
						{isUpdate ? m.audit_changes({ count: changedCount }) : m.audit_values()}
					</Heading>
					{#if isUpdate && changedCount < data.diff.length}
						<Toggle bind:checked={showAll}>{m.audit_show_unchanged()}</Toggle>
					{/if}
				</div>
				{#if rows.length === 0}
					<p class="text-sm text-gray-600 dark:text-gray-400">{m.audit_no_changes()}</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full table-fixed text-left text-sm">
							<thead class="text-xs text-gray-500 uppercase dark:text-gray-400">
								<tr>
									<th class="w-40 py-2 pe-3 font-medium">{m.audit_field()}</th>
									{#if data.entry.action !== 'create'}
										<th class="py-2 pe-3 font-medium">{m.audit_before()}</th>
									{/if}
									{#if data.entry.action !== 'delete'}
										<th class="py-2 font-medium">{m.audit_after()}</th>
									{/if}
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 align-top dark:divide-gray-700">
								{#each rows as row (row.key)}
									{@const tone = isUpdate && row.changed}
									<tr>
										<td
											class={[
												'py-2 pe-3 font-mono text-xs break-all',
												tone
													? 'font-semibold text-gray-900 dark:text-white'
													: 'text-gray-500 dark:text-gray-400'
											]}>{row.key}</td
										>
										{#if data.entry.action !== 'create'}
											<td class="py-2 pe-3">{@render value(row.before, tone ? 'old' : null)}</td>
										{/if}
										{#if data.entry.action !== 'delete'}
											<td class="py-2">{@render value(row.after, tone ? 'new' : null)}</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card>
		{/if}
		{#if data.rawBefore}
			{@render raw(m.audit_before(), data.rawBefore)}
		{/if}
		{#if data.rawAfter}
			{@render raw(m.audit_after(), data.rawAfter)}
		{/if}
		{#if !data.diff.length && !data.rawBefore && !data.rawAfter}
			<Card size="xl" class="p-6">
				<p class="text-sm text-gray-600 dark:text-gray-400">{m.audit_no_values()}</p>
			</Card>
		{/if}
	</div>

	<Card size="xl" class="p-6">
		<Heading tag="h2" class="mb-3 text-lg font-medium">{m.audit_request()}</Heading>
		<dl class="space-y-3 text-sm">
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.audit_user()}</dt>
				<dd class="text-gray-900 dark:text-white">
					{#if data.user}
						<a
							href={resolve('/(app)/users/[id=id]', { id: data.user.id })}
							class="font-medium hover:text-primary-700 hover:underline dark:hover:text-primary-400"
							>{data.user.name ?? `#${data.user.id}`}</a
						>
						{#if data.user.email}
							<span class="block text-xs text-gray-500 dark:text-gray-400">{data.user.email}</span>
						{/if}
					{:else}
						{m.audit_no_user()}
					{/if}
				</dd>
			</div>
			{#each details as detail (detail.label)}
				<div>
					<dt class="text-gray-500 dark:text-gray-400">{detail.label}</dt>
					<dd class="break-words text-gray-900 dark:text-white">
						{detail.value || m.audit_unknown()}
					</dd>
				</div>
			{/each}
		</dl>
	</Card>
</div>
