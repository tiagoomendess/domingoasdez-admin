<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Card,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { CheckCircleOutline } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import BanStatus from '../BanStatus.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canEdit = $derived(can(data.user.permissions, 'score-report-bans.edit'));
	const canDelete = $derived(can(data.user.permissions, 'score-report-bans.create'));
	const ban = $derived(data.ban);
	let lifting = $state(false);

	const score = (home: number | null, away: number | null) =>
		home === null || away === null ? '–' : `${home}-${away}`;
</script>

<PageHeader
	title={m.score_bans_title({ id: ban.id })}
	back={resolve('/(app)/score-report-bans')}
	backLabel={m.nav_score_report_bans()}
>
	{#snippet actions()}
		<BanStatus active={ban.active} large />
		{#if canEdit && ban.active}
			<form
				method="POST"
				action="?/lift"
				use:enhance={() => {
					lifting = true;
					return async ({ update }) => {
						await update();
						lifting = false;
					};
				}}
			>
				<Button type="submit" color="green" outline class="gap-2" loading={lifting}>
					{#if !lifting}<CheckCircleOutline class="size-4" aria-hidden="true" />{/if}
					{m.score_bans_lift()}
				</Button>
			</form>
		{/if}
		{#if canDelete}
			<DeleteButton title={m.score_bans_delete_title({ id: ban.id })}>
				<p>{m.score_bans_delete_hint()}</p>
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
	{#if ban.expiresAt}
		{ban.active ? m.score_bans_until() : m.score_bans_ended()}
		<DateTime value={ban.expiresAt} />
	{/if}
	{#if ban.createdAt}
		· {m.common_created_at()} <DateTime value={ban.createdAt} />
	{/if}
</p>

{#if !canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-3">
	<div class="xl:col-span-2">
		{#key ban.updatedAt}
			<EntityForm
				{form}
				action="?/save"
				readonly={!canEdit}
				cancelHref={resolve('/(app)/score-report-bans')}
			>
				<Card size="xl" class="space-y-5 p-6">
					<TextField
						name="expires_at"
						type="datetime-local"
						label={m.score_bans_expires()}
						hint={m.score_bans_expires_hint()}
						value={ban.expiresAtInput}
						required
					/>
					<TextField
						name="reason"
						label={m.score_bans_reason()}
						value={ban.reason}
						required
						maxlength={255}
					/>
					<ToggleField
						name="shadow_ban"
						label={m.score_bans_shadow()}
						hint={m.score_bans_shadow_hint()}
						checked={ban.shadowBan}
					/>
					{#if ban.ipAddress}
						<ToggleField
							name="ip_ban"
							label={m.score_bans_ip_ban()}
							hint={m.score_bans_ip_ban_hint()}
							checked={ban.ipBan}
						/>
					{/if}
				</Card>
			</EntityForm>
		{/key}
	</div>

	<Card size="xl" class="p-6">
		<Heading tag="h2" class="mb-3 text-lg font-medium">{m.score_bans_who()}</Heading>
		<dl class="space-y-3 text-sm">
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.score_bans_user()}</dt>
				<dd class="text-gray-900 dark:text-white">
					{#if data.bannedUser}
						<a
							href={resolve('/(app)/users/[id=id]', { id: Number(data.bannedUser.value) })}
							class="font-medium hover:text-primary-700 hover:underline dark:hover:text-primary-400"
							>{data.bannedUser.label}</a
						>
					{:else if ban.userId}
						#{ban.userId}
					{:else}
						–
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.score_bans_ip()}</dt>
				<dd class="font-mono text-gray-900 dark:text-white">{ban.ipAddress ?? '–'}</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.score_bans_device()}</dt>
				<dd
					class="flex items-center gap-2 font-mono text-xs break-all text-gray-900 dark:text-white"
				>
					{#if ban.uuid}
						{ban.uuid}
						<CopyButton
							text={ban.uuid}
							label={m.score_bans_copy_device()}
							copiedLabel={m.score_bans_device_copied()}
						/>
					{:else}
						–
					{/if}
				</dd>
			</div>
			<div>
				<dt class="text-gray-500 dark:text-gray-400">{m.score_bans_user_agent()}</dt>
				<dd class="text-xs break-words text-gray-900 dark:text-white">{ban.userAgent ?? '–'}</dd>
			</div>
		</dl>
	</Card>
</div>

<section class="mt-8">
	<Heading tag="h2" class="mb-1 text-lg font-medium">{m.score_bans_reports()}</Heading>
	<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">{m.score_bans_reports_hint()}</p>
	{#if data.reports.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.score_bans_no_reports()}</p>
	{:else}
		<Table shadow>
			<TableHead>
				<TableHeadCell class="w-40">{m.score_bans_report_date()}</TableHeadCell>
				<TableHeadCell>{m.score_bans_report_game()}</TableHeadCell>
				<TableHeadCell class="w-28">{m.score_bans_report_sent()}</TableHeadCell>
				<TableHeadCell class="w-28">{m.score_bans_report_final()}</TableHeadCell>
				<TableHeadCell class="w-48">{m.score_bans_report_from()}</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each data.reports as report (report.id)}
					<TableBodyRow>
						<TableBodyCell class="text-gray-600 dark:text-gray-400">
							<DateTime value={report.createdAt} />
						</TableBodyCell>
						<TableBodyCell class="whitespace-normal">
							<a
								href={resolve('/(app)/games/[id=id]', { id: report.gameId })}
								class="text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
								>{report.homeClub} vs {report.awayClub}</a
							>
							<span class="block text-xs text-gray-500 dark:text-gray-400">
								{report.source}{report.finished ? ` · ${m.score_bans_report_finished()}` : ''}
							</span>
						</TableBodyCell>
						<TableBodyCell class="tabular-nums">
							<span class="font-medium text-gray-900 dark:text-white">
								{score(report.homeScore, report.awayScore)}
							</span>
							{#if report.isFake}
								<Badge color="red" class="ms-1">{m.score_bans_report_fake()}</Badge>
							{/if}
						</TableBodyCell>
						<TableBodyCell class="text-gray-600 tabular-nums dark:text-gray-400">
							{score(report.gameHomeScore, report.gameAwayScore)}
						</TableBodyCell>
						<TableBodyCell class="text-xs text-gray-600 dark:text-gray-400">
							{report.sameDevice
								? m.score_bans_report_same_device()
								: m.score_bans_report_same_ip()}
							{#if report.ipCountry && report.ipCountry !== 'Unknown'}· {report.ipCountry}{/if}
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</section>
