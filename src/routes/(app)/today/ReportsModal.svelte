<script lang="ts">
	import { A, Badge, Button, Modal, Spinner } from 'flowbite-svelte';
	import {
		BanOutline,
		ChevronDownOutline,
		MapPinAltOutline,
		MapPinAltSolid,
		UserOutline,
		UserSolid
	} from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import { DEFAULT_TIMEZONE, isTimeZone } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { resolvePath } from '#lib/paths.ts';

	type Report = {
		id: number;
		createdAt: string | Date;
		homeScore: number;
		awayScore: number;
		finished: boolean;
		source: string;
		isFake: boolean;
		isCorrect: boolean;
		signedIn: boolean;
		accuracy: 'best' | 'good' | 'fair' | 'poor' | 'bad' | null;
		/** Who sent it: only for `score_update`. */
		details: {
			userId: number | null;
			userName: string | null;
			ipAddress: string | null;
			ipCountry: string | null;
			userAgent: string | null;
			uuid: string | null;
			location: { lat: number; lng: number } | null;
			accuracyMetres: number | null;
			karma: number | null;
		} | null;
	};

	let {
		gameId,
		title,
		open = $bindable(false),
		canBan = false,
		canSeeUsers = false
	}: {
		gameId: number;
		title: string;
		open?: boolean;
		/** `score-report-bans.create`: a "ban this device" link per report. */
		canBan?: boolean;
		/** `users`: link the sender to their user page. */
		canSeeUsers?: boolean;
	} = $props();

	let reports = $state<Report[] | null>(null);
	let failed = $state(false);

	let controller: AbortController | null = null;

	/** Opens the modal and loads the reports (again each time: new ones keep arriving). */
	export async function show() {
		open = true;
		failed = false;
		controller?.abort();
		controller = new AbortController();
		try {
			const response = await fetch(resolve('/(app)/today/reports/[id=id]', { id: gameId }), {
				signal: controller.signal
			});
			if (!response.ok) throw new Error(String(response.status));
			reports = ((await response.json()) as { reports: Report[] }).reports;
		} catch (error) {
			if ((error as Error).name !== 'AbortError') failed = true;
		}
	}

	const timeFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			timeZone: isTimeZone(page.data.timezone) ? page.data.timezone : DEFAULT_TIMEZONE,
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	const sources: Record<string, () => string> = {
		website: m.today_source_website,
		api_afpb_crawler: m.today_source_afpb,
		placard: m.today_source_placard,
		admin: m.today_source_admin
	};
	const sourceLabel = (source: string) => sources[source]?.() ?? source;

	/** Legacy pin colours, from the most to the least precise location. */
	const pinColors = {
		best: 'text-green-700 dark:text-green-400',
		good: 'text-green-500 dark:text-green-300',
		fair: 'text-yellow-500 dark:text-yellow-300',
		poor: 'text-orange-500 dark:text-orange-400',
		bad: 'text-red-600 dark:text-red-400'
	} as const;

	const karmaColor = (karma: number) =>
		karma < 0
			? 'text-red-700 dark:text-red-400'
			: karma === 0
				? 'text-gray-500 dark:text-gray-400'
				: 'text-green-700 dark:text-green-400';

	const mapUrl = (location: { lat: number; lng: number }) =>
		`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`;

	/** Prefills the ban form with everything that identifies the sender. */
	function banHref(details: NonNullable<Report['details']>) {
		const values = {
			uuid: details.uuid,
			ip: details.ipAddress,
			user: details.userId ? String(details.userId) : null,
			user_agent: details.userAgent
		};
		const query = Object.entries(values)
			.filter((entry): entry is [string, string] => Boolean(entry[1]))
			.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
			.join('&');
		return resolvePath(`/score-report-bans/new?${query}`);
	}
</script>

{#snippet copyable(label: string, value: string | null)}
	<div class="sm:col-span-2">
		<dt class="text-gray-500 dark:text-gray-400">{label}</dt>
		<dd class="flex items-start gap-2 font-mono text-xs break-all text-gray-900 dark:text-white">
			{#if value}
				<span class="min-w-0 flex-1">{value}</span>
				<CopyButton
					text={value}
					label={m.today_copy({ what: label })}
					copiedLabel={m.today_copied()}
				/>
			{:else}
				–
			{/if}
		</dd>
	</div>
{/snippet}

<Modal bind:open {title} size="lg" outsideclose>
	{#if failed}
		<p class="text-sm text-red-700 dark:text-red-400" role="alert">{m.today_reports_failed()}</p>
	{:else if reports === null}
		<div class="flex justify-center py-8"><Spinner /></div>
	{:else if reports.length === 0}
		<p class="py-6 text-center text-gray-600 dark:text-gray-400">{m.today_reports_empty()}</p>
	{:else}
		<p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
			{m.today_reports_count({ count: reports.length })}
		</p>
		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#each reports as report (report.id)}
				<li>
					<details class="group">
						<summary
							class={[
								'flex cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden',
								!report.details && 'cursor-default'
							]}
						>
							<span class="w-12 text-sm text-gray-600 tabular-nums dark:text-gray-400">
								{timeFormat.format(new Date(report.createdAt))}
							</span>
							<span
								class={[
									'w-14 rounded-sm px-2 py-0.5 text-center text-sm font-bold tabular-nums',
									report.finished
										? 'bg-red-700 text-white dark:bg-red-800'
										: 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white'
								]}
								title={report.finished ? m.today_report_final() : undefined}
							>
								{report.homeScore}-{report.awayScore}
							</span>
							<span class="flex flex-1 flex-wrap items-center gap-2">
								{#if report.signedIn}
									<UserSolid
										class="size-4 text-gray-800 dark:text-gray-200"
										aria-label={m.today_legend_signed_in()}
									/>
								{:else}
									<UserOutline
										class="size-4 text-gray-400"
										aria-label={m.today_legend_anonymous()}
									/>
								{/if}
								{#if report.accuracy}
									<MapPinAltSolid
										class={['size-4', pinColors[report.accuracy]]}
										aria-label={m.today_legend_location()}
									/>
								{:else}
									<MapPinAltOutline
										class="size-4 text-gray-400"
										aria-label={m.today_legend_no_location()}
									/>
								{/if}
								<Badge color="gray">{sourceLabel(report.source)}</Badge>
								{#if report.isFake}<Badge color="red">{m.today_report_fake()}</Badge>{/if}
								{#if report.isCorrect}<Badge color="green">{m.today_report_correct()}</Badge>{/if}
								{#if report.details?.karma !== null && report.details?.karma !== undefined}
									<span
										class={['text-sm font-bold', karmaColor(report.details.karma)]}
										title={m.today_karma()}>{report.details.karma}</span
									>
								{/if}
							</span>
							{#if report.details}
								{#if report.details.uuid}
									<span
										class="font-mono text-xs text-gray-500 dark:text-gray-400"
										title={m.today_device()}>{report.details.uuid.slice(-4)}</span
									>
								{/if}
								<ChevronDownOutline
									class="size-4 text-gray-400 transition-transform group-open:rotate-180"
									aria-hidden="true"
								/>
							{/if}
						</summary>

						{#if report.details}
							{@const details = report.details}
							<dl
								class="mb-3 grid gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-2 dark:bg-gray-700/50"
							>
								<div>
									<dt class="text-gray-500 dark:text-gray-400">{m.today_user()}</dt>
									<dd class="text-gray-900 dark:text-white">
										{#if details.userId && canSeeUsers}
											<a
												href={resolve('/(app)/users/[id=id]', { id: details.userId })}
												class="font-medium hover:text-primary-700 hover:underline dark:hover:text-primary-400"
												>{details.userName ?? `#${details.userId}`}</a
											>
										{:else if details.userId}
											{details.userName ?? `#${details.userId}`}
										{:else}
											{m.today_not_signed_in()}
										{/if}
									</dd>
								</div>
								<div>
									<dt class="text-gray-500 dark:text-gray-400">{m.today_location()}</dt>
									<dd class="text-gray-900 dark:text-white">
										{#if details.location}
											<A href={mapUrl(details.location)} target="_blank" rel="noopener noreferrer">
												{details.accuracyMetres !== null
													? m.today_location_accuracy({ metres: details.accuracyMetres })
													: m.today_location_map()}
											</A>
										{:else}
											{m.today_location_none()}
										{/if}
									</dd>
								</div>
								<div>
									<dt class="text-gray-500 dark:text-gray-400">{m.today_country()}</dt>
									<dd class="text-gray-900 dark:text-white">{details.ipCountry ?? '–'}</dd>
								</div>
								<div>
									<dt class="text-gray-500 dark:text-gray-400">{m.today_source()}</dt>
									<dd class="text-gray-900 dark:text-white">{sourceLabel(report.source)}</dd>
								</div>
								{@render copyable(m.today_ip(), details.ipAddress)}
								{@render copyable(m.today_user_agent(), details.userAgent)}
								{@render copyable(m.today_device(), details.uuid)}
								{#if canBan && report.source === 'website'}
									<div class="sm:col-span-2">
										<Button href={banHref(details)} color="red" outline size="xs" class="gap-1.5">
											<BanOutline class="size-3.5" aria-hidden="true" />
											{m.today_ban_sender()}
										</Button>
									</div>
								{/if}
							</dl>
						{/if}
					</details>
				</li>
			{/each}
		</ul>

		<details class="mt-4 text-sm text-gray-600 dark:text-gray-400">
			<summary class="cursor-pointer font-medium">{m.today_legend()}</summary>
			<ul class="mt-2 space-y-1.5">
				<li class="flex items-center gap-2">
					<UserSolid class="size-4 text-gray-800 dark:text-gray-200" aria-hidden="true" />
					{m.today_legend_signed_in()}
				</li>
				<li class="flex items-center gap-2">
					<UserOutline class="size-4 text-gray-400" aria-hidden="true" />
					{m.today_legend_anonymous()}
				</li>
				<li class="flex items-center gap-2">
					<MapPinAltSolid class="size-4 text-green-700 dark:text-green-400" aria-hidden="true" />
					{m.today_legend_location()}
				</li>
				<li class="flex items-center gap-2">
					<MapPinAltOutline class="size-4 text-gray-400" aria-hidden="true" />
					{m.today_legend_no_location()}
				</li>
				<li class="flex items-center gap-2">
					<span class="w-8 rounded-sm bg-red-700 text-center text-xs font-bold text-white">1-0</span
					>
					{m.today_legend_final()}
				</li>
			</ul>
		</details>
	{/if}
</Modal>
