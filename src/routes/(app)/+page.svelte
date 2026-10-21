<script lang="ts">
	import { Button, ButtonGroup, P } from 'flowbite-svelte';
	import {
		BanOutline,
		ChartLineUpOutline,
		ClipboardCheckOutline,
		ExclamationCircleOutline,
		MessageDotsOutline,
		ShieldCheckOutline,
		StarOutline,
		UserAddOutline,
		UsersOutline
	} from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { resolvePath } from '#lib/paths.ts';
	import { can, type Permission } from '#lib/auth/permissions.ts';
	import { DASHBOARD_PERIODS, type DailyMetric } from '#lib/dashboard.ts';
	import DailyChart, {
		seriesColors,
		type ChartSeries
	} from '#lib/components/dashboard/DailyChart.svelte';
	import StatCard from '#lib/components/dashboard/StatCard.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const metrics = $derived(data.metrics);
	const days = $derived(metrics.days);
	const period = $derived({ days: metrics.period });
	const isAdmin = $derived(can(data.user.permissions, 'admin'));
	const locale = $derived(getLocale());

	/**
	 * Link to a section, only when the admin may open it (legacy showed every link). Most
	 * sections are not ported yet, so the paths can't be typed routes (see `SideNav`).
	 */
	const linkTo = (path: string, permission: Permission, search = '') =>
		can(data.user.permissions, permission) ? resolvePath(path) + search : undefined;

	/** A one-series metric as chart input. */
	const single = (metric: DailyMetric, label: string): ChartSeries[] => [
		{ key: 'total', label, values: metric.series[0].values, color: seriesColors[0] }
	];

	/** Score report sources: a source keeps its colour whichever others have data. */
	const sourceLabels: Record<string, () => string> = {
		website: m.today_source_website,
		api_afpb_crawler: m.today_source_afpb,
		placard: m.today_source_placard,
		admin: m.dashboard_source_admin,
		other: m.dashboard_source_other
	};
	const scoreSeries = $derived(
		metrics.scoreReports.series.map((s, i) => ({
			key: s.key,
			label: sourceLabels[s.key]?.() ?? s.key,
			values: s.values,
			color: seriesColors[i % seriesColors.length]
		}))
	);

	const comparison = (metric: DailyMetric) => ({
		previous: metric.previousTotal,
		label: m.dashboard_comparison(period),
		upIsGood: true
	});

	const maxPartnerClicks = $derived(Math.max(1, ...metrics.partners.map((p) => p.clicks)));

	const rowClass =
		'flex items-center justify-between gap-3 border-b border-gray-200 py-2 last:border-b-0 dark:border-gray-700';
</script>

<PageHeader title={m.dashboard_title()}>
	{#snippet actions()}
		<ButtonGroup aria-label={m.dashboard_period()}>
			{#each DASHBOARD_PERIODS as option (option)}
				<Button
					href={`${resolve('/(app)')}?days=${option}`}
					color={option === metrics.period ? 'primary' : 'alternative'}
					size="sm"
					aria-current={option === metrics.period ? 'true' : undefined}
				>
					{m.dashboard_period_days({ days: option })}
				</Button>
			{/each}
		</ButtonGroup>
	{/snippet}
</PageHeader>
<P class="-mt-4 mb-6 text-gray-500 dark:text-gray-400">
	{m.dashboard_welcome({ name: data.user.name })}
</P>

{#snippet incoming(metric: DailyMetric, label: string)}
	<p class="mb-1 text-xs text-gray-600 dark:text-gray-400">
		{label}:
		<span class="font-semibold text-gray-900 dark:text-white">
			{formatNumber(metric.total, locale)}
		</span>
	</p>
	<DailyChart {label} {days} series={single(metric, label)} compact />
{/snippet}

<!-- Queues to review: what is waiting now, and how much came in during the period. -->
<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
	<StatCard
		title={m.dashboard_update_requests_title()}
		icon={UserAddOutline}
		tone="orange"
		value={metrics.pendingUpdateRequests}
		description={m.dashboard_update_requests_text()}
		href={linkTo('/player-update-requests', 'player_update_requests')}
		linkLabel={m.dashboard_update_requests_link()}
	>
		{@render incoming(metrics.updateRequests, m.dashboard_update_requests_new(period))}
	</StatCard>

	<StatCard
		title={m.dashboard_info_reports_title()}
		icon={ExclamationCircleOutline}
		tone="purple"
		value={metrics.unseenInfoReports}
		description={m.dashboard_info_reports_text()}
		href={linkTo('/info-reports', 'info_reports')}
		linkLabel={m.dashboard_info_reports_link()}
	>
		{@render incoming(metrics.infoReports, m.dashboard_info_reports_new(period))}
	</StatCard>

	<StatCard
		title={m.dashboard_bans_title()}
		icon={BanOutline}
		tone="red"
		value={metrics.activeBans}
		description={m.dashboard_bans_text()}
		href={linkTo('/score-report-bans', 'score-report-bans')}
		linkLabel={m.dashboard_bans_link()}
	>
		{@render incoming(metrics.bans, m.dashboard_bans_new(period))}
	</StatCard>
</div>

<div class="mt-4">
	<StatCard
		title={m.dashboard_score_reports_title()}
		icon={ClipboardCheckOutline}
		tone="green"
		value={metrics.scoreReports.total}
		description={m.dashboard_score_reports_text(period)}
		comparison={comparison(metrics.scoreReports)}
	>
		<DailyChart label={m.dashboard_score_reports_text(period)} {days} series={scoreSeries} />
	</StatCard>
</div>

<div class="mt-4 grid gap-4 lg:grid-cols-2">
	<StatCard
		title={m.dashboard_mvp_votes_title()}
		icon={StarOutline}
		tone="amber"
		value={metrics.mvpVotes.total}
		description={m.dashboard_mvp_votes_text(period)}
		comparison={comparison(metrics.mvpVotes)}
	>
		<DailyChart
			label={m.dashboard_mvp_votes_text(period)}
			{days}
			series={single(metrics.mvpVotes, m.dashboard_mvp_votes_title())}
		/>
	</StatCard>

	<StatCard
		title={m.dashboard_flash_interviews_title()}
		icon={MessageDotsOutline}
		tone="violet"
		value={metrics.flashInterviews.total}
		description={m.dashboard_flash_interviews_text(period)}
		comparison={comparison(metrics.flashInterviews)}
		href={linkTo('/game-comments', 'games')}
		linkLabel={m.dashboard_flash_interviews_link()}
	>
		<DailyChart
			label={m.dashboard_flash_interviews_text(period)}
			{days}
			series={single(metrics.flashInterviews, m.dashboard_flash_interviews_title())}
		/>
	</StatCard>

	<StatCard
		title={m.dashboard_partner_clicks_title()}
		icon={ChartLineUpOutline}
		tone="blue"
		value={metrics.partnerClicks.total}
		description={m.dashboard_partner_clicks_text(period)}
		comparison={comparison(metrics.partnerClicks)}
		href={linkTo('/partners', 'partners')}
		linkLabel={m.dashboard_partner_clicks_link()}
	>
		<DailyChart
			label={m.dashboard_partner_clicks_text(period)}
			{days}
			series={single(metrics.partnerClicks, m.dashboard_partner_clicks_title())}
		/>
		{#if metrics.partners.length === 0}
			<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
				{m.dashboard_partner_clicks_empty()}
			</p>
		{:else}
			<ul class="mt-4">
				{#each metrics.partners as partner (partner.id)}
					<li class={rowClass}>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium text-gray-900 dark:text-white">{partner.name}</p>
							<div class="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
								<div
									class={['h-full rounded-full', seriesColors[0]]}
									style:width="{(partner.clicks / maxPartnerClicks) * 100}%"
								></div>
							</div>
						</div>
						<div class="shrink-0 text-right">
							<p class="font-bold text-gray-900 tabular-nums dark:text-white">
								{formatNumber(partner.clicks, locale)}
							</p>
							<p class="text-xs text-gray-500 tabular-nums dark:text-gray-400">
								{m.dashboard_partner_clicks_all_time({
									count: formatNumber(partner.allTime, locale)
								})}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</StatCard>

	<StatCard
		title={m.dashboard_users_title()}
		icon={UsersOutline}
		tone="cyan"
		value={metrics.newUsers.total}
		description={m.dashboard_users_text(period)}
		comparison={comparison(metrics.newUsers)}
		href={linkTo('/users', 'users')}
		linkLabel={m.dashboard_users_link()}
	>
		<DailyChart
			label={m.dashboard_users_text(period)}
			{days}
			series={single(metrics.newUsers, m.dashboard_users_title())}
		/>
		<p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
			{m.dashboard_users_total()}:
			<span class="font-semibold text-gray-900 dark:text-white">
				{formatNumber(metrics.registeredUsers, locale)}
			</span>
		</p>
	</StatCard>

	<StatCard
		title={m.dashboard_staff_title()}
		icon={ShieldCheckOutline}
		tone="teal"
		href={linkTo('/users', 'users', '?has_permissions=1')}
		linkLabel={m.dashboard_staff_link()}
	>
		{#if metrics.staff.length === 0}
			<p class="text-sm text-gray-600 dark:text-gray-400">{m.dashboard_staff_empty()}</p>
		{:else}
			<ul>
				{#each metrics.staff as member (member.id)}
					<li class={rowClass}>
						{#if isAdmin}
							<a
								href={resolvePath(`/users/${member.id}`)}
								class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
							>
								{member.name}
							</a>
						{:else}
							<span class="font-medium text-gray-900 dark:text-white">{member.name}</span>
						{/if}
						<ShieldCheckOutline
							class="size-5 shrink-0 text-primary-600 dark:text-primary-400"
							aria-hidden="true"
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</StatCard>
</div>
