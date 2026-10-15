<script lang="ts">
	import { Card, Heading, P } from 'flowbite-svelte';
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
	import { resolvePath } from '#lib/paths.ts';
	import { can, type Permission } from '#lib/auth/permissions.ts';
	import StatCard from '#lib/components/dashboard/StatCard.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const metrics = $derived(data.metrics);
	const isAdmin = $derived(can(data.user.permissions, 'admin'));

	/**
	 * Link to a section, only when the admin may open it (legacy showed every link). Most
	 * sections are not ported yet, so the paths can't be typed routes (see `SideNav`).
	 */
	const linkTo = (path: string, permission: Permission, search = '') =>
		can(data.user.permissions, permission) ? resolvePath(path) + search : undefined;

	const TUTORIALS_PLAYLIST = 'PL_GkJl6tG6PckYIYCDM5RtLCc38L63lQk';
	const tutorialsUrl = `https://www.youtube.com/playlist?list=${TUTORIALS_PLAYLIST}`;
	const tutorialsEmbed = `https://www.youtube-nocookie.com/embed/videoseries?list=${TUTORIALS_PLAYLIST}`;

	const rowClass =
		'flex items-center justify-between gap-3 border-b border-gray-200 py-2 last:border-b-0 dark:border-gray-700';
</script>

<PageHeader title={m.dashboard_title()} />
<P class="-mt-4 mb-6 text-gray-500 dark:text-gray-400">
	{m.dashboard_welcome({ name: data.user.name })}
</P>

<!-- Queues to review: the legacy cards with a link to their section. -->
<div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
	<StatCard
		title={m.dashboard_update_requests_title()}
		icon={UserAddOutline}
		tone="orange"
		value={metrics.pendingUpdateRequests}
		description={m.dashboard_update_requests_text()}
		href={linkTo('/player-update-requests', 'player_update_requests')}
		linkLabel={m.dashboard_update_requests_link()}
	/>

	<StatCard
		title={m.dashboard_info_reports_title()}
		icon={ExclamationCircleOutline}
		tone="purple"
		value={metrics.unseenInfoReports}
		description={m.dashboard_info_reports_text()}
		href={linkTo('/info-reports', 'info_reports')}
		linkLabel={m.dashboard_info_reports_link()}
	/>

	<StatCard
		title={m.dashboard_flash_interviews_title()}
		icon={MessageDotsOutline}
		tone="violet"
		value={metrics.editedFlashInterviews48h}
		description={m.dashboard_flash_interviews_text()}
		href={linkTo('/game-comments', 'games')}
		linkLabel={m.dashboard_flash_interviews_link()}
	/>

	<StatCard
		title={m.dashboard_bans_title()}
		icon={BanOutline}
		tone="red"
		value={metrics.activeBans}
		description={m.dashboard_bans_text()}
		href={linkTo('/score-report-bans', 'score-report-bans')}
		linkLabel={m.dashboard_bans_link()}
	/>
</div>

<div class="mt-4 grid gap-4 sm:grid-cols-3">
	<StatCard
		title={m.dashboard_mvp_votes_title()}
		icon={StarOutline}
		tone="amber"
		value={metrics.mvpVotes24h}
		description={m.dashboard_mvp_votes_text()}
	/>

	<StatCard
		title={m.dashboard_score_reports_title()}
		icon={ClipboardCheckOutline}
		tone="green"
		value={metrics.scoreReports24h}
		description={m.dashboard_score_reports_text()}
	/>

	<StatCard
		title={m.dashboard_users_title()}
		icon={UsersOutline}
		tone="cyan"
		value={metrics.registeredUsers}
		description={m.dashboard_users_text()}
		href={linkTo('/users', 'users')}
		linkLabel={m.dashboard_users_link()}
	/>
</div>

<!-- Lists get their own row so they do not stretch the counters next to them. -->
<div class="mt-4 grid gap-4 lg:grid-cols-2">
	<StatCard
		title={m.dashboard_partner_clicks_title()}
		icon={ChartLineUpOutline}
		tone="blue"
		href={linkTo('/partners', 'partners')}
		linkLabel={m.dashboard_partner_clicks_link()}
	>
		{#if metrics.partnerClicks.length === 0}
			<p class="text-sm text-gray-600 dark:text-gray-400">{m.dashboard_partner_clicks_empty()}</p>
		{:else}
			<ul>
				{#each metrics.partnerClicks as partner (partner.id)}
					<li class={rowClass}>
						<span class="font-medium text-gray-900 dark:text-white">{partner.name}</span>
						<span class="text-lg font-bold text-primary-700 tabular-nums dark:text-primary-400">
							{formatNumber(partner.clicks, getLocale())}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
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

<Card size="xl" class="mt-10 flex-col gap-4 p-6">
	<Heading tag="h2" class="text-xl font-medium">{m.dashboard_tutorials_title()}</Heading>
	<P class="text-gray-600 dark:text-gray-400">
		{m.dashboard_tutorials_text()}
		<a
			href={tutorialsUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="font-medium text-primary-700 hover:underline dark:text-primary-400"
		>
			{m.dashboard_tutorials_link()}
		</a>
	</P>
	<div
		class="aspect-video w-full max-w-4xl overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900"
	>
		<iframe
			src={tutorialsEmbed}
			title={m.dashboard_tutorials_title()}
			class="size-full"
			loading="lazy"
			referrerpolicy="strict-origin-when-cross-origin"
			allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
		></iframe>
	</div>
</Card>
