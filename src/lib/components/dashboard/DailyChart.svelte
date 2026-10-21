<script lang="ts" module>
	/**
	 * Categorical series colours (fixed order, validated for colour blindness), stepped for
	 * each mode. A series keeps its colour whatever else is shown.
	 */
	export const seriesColors = [
		'bg-[#2a78d6] dark:bg-[#3987e5]',
		'bg-[#eb6834] dark:bg-[#d95926]',
		'bg-[#1baf7a] dark:bg-[#199e70]',
		'bg-[#eda100] dark:bg-[#c98500]',
		'bg-[#898781] dark:bg-[#898781]'
	] as const;

	export interface ChartSeries {
		key: string;
		label: string;
		values: number[];
		/** One of `seriesColors`. */
		color: string;
	}

	/** Smallest 1/2/5 × 10ⁿ step whose two ticks cover `max`. */
	function tickStep(max: number): number {
		const half = Math.max(max / 2, 1);
		const power = 10 ** Math.floor(Math.log10(half));
		const factor = [1, 2, 2.5, 5, 10].find((f) => f * power >= half) ?? 10;
		return Math.max(1, Math.ceil(factor * power));
	}
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	let {
		label,
		days,
		series,
		compact = false
	}: {
		/** What the chart shows (accessible name and table caption). */
		label: string;
		/** Calendar days (`YYYY-MM-DD`), oldest first. */
		days: string[];
		/** Stacked bottom to top. */
		series: ChartSeries[];
		/** A small chart without axes, for a card's secondary trend. */
		compact?: boolean;
	} = $props();

	let active = $state<number | null>(null);

	const locale = $derived(getLocale());
	const totals = $derived(days.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0)));
	const step = $derived(tickStep(Math.max(...totals, 0)));
	const ticks = $derived([0, step, step * 2]);
	const top = $derived(step * 2);
	/** Series with data in the period: the legend and tooltip skip the empty ones. */
	const shown = $derived(series.filter((s) => s.values.some((value) => value > 0)));
	/** Label every nth day, counted back from today so today is always labelled. */
	const labelEvery = $derived(days.length <= 7 ? 1 : days.length <= 14 ? 2 : 7);

	const numberFormat = $derived(new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }));
	const tickFormat = $derived(
		new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
	);
	const asDate = (day: string) => new Date(`${day}T12:00:00Z`);
	const axisFormat = $derived(
		new Intl.DateTimeFormat(
			locale,
			days.length <= 7
				? { weekday: 'short', day: 'numeric', timeZone: 'UTC' }
				: { day: 'numeric', month: 'short', timeZone: 'UTC' }
		)
	);
	const longFormat = $derived(
		new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC'
		})
	);

	function onkeydown(event: KeyboardEvent) {
		const last = days.length - 1;
		const moves: Record<string, number> = {
			ArrowLeft: Math.max(0, (active ?? last) - 1),
			ArrowRight: Math.min(last, (active ?? last) + 1),
			Home: 0,
			End: last
		};
		if (event.key in moves) {
			event.preventDefault();
			active = moves[event.key];
		}
	}

	/** Keeps the tooltip inside the chart at both ends. */
	const tooltipAlign = (i: number) =>
		i < days.length / 4
			? ''
			: i >= (days.length * 3) / 4
				? '-translate-x-full'
				: '-translate-x-1/2';
</script>

<figure class="m-0">
	{#if !compact && shown.length > 1}
		<ul class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
			{#each shown as s (s.key)}
				<li class="flex items-center gap-1.5">
					<span class={['size-2.5 rounded-sm', s.color]} aria-hidden="true"></span>
					{s.label}
				</li>
			{/each}
		</ul>
	{/if}

	<div class={['relative', compact ? 'h-12' : 'h-40 pl-9']}>
		{#if !compact}
			<!-- Gridlines with their values in the left gutter. -->
			{#each ticks as tick (tick)}
				<div
					class={[
						'pointer-events-none absolute inset-x-0 border-t',
						tick === 0
							? 'border-gray-300 dark:border-gray-600'
							: 'border-gray-100 dark:border-gray-700/70'
					]}
					style:bottom="{(tick / top) * 100}%"
				>
					<span
						class="absolute top-0 left-0 w-7 -translate-y-1/2 text-right text-xs text-gray-500 tabular-nums dark:text-gray-400"
					>
						{tickFormat.format(tick)}
					</span>
				</div>
			{/each}
		{:else}
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 border-t border-gray-200 dark:border-gray-700"
			></div>
		{/if}

		<!-- Focusable so the arrow keys can move the tooltip between days. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="absolute inset-y-0 right-0 flex items-end rounded-sm focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none {compact
				? 'left-0'
				: 'left-9'}"
			role="group"
			aria-label={label}
			tabindex="0"
			{onkeydown}
			onfocus={() => (active ??= days.length - 1)}
			onblur={() => (active = null)}
			onpointerleave={() => (active = null)}
		>
			{#each days as day, i (day)}
				<div
					class={[
						'flex h-full flex-1 items-end justify-center px-px',
						active === i && 'bg-gray-900/5 dark:bg-white/5'
					]}
					onpointerenter={() => (active = i)}
					aria-hidden="true"
				>
					{#if totals[i] > 0}
						<div
							class="flex w-full max-w-6 flex-col-reverse overflow-hidden rounded-t"
							style:height="max({(totals[i] / top) * 100}%, 2px)"
						>
							{#each series as s (s.key)}
								{#if s.values[i] > 0}
									<!-- The border is the 2px gap between stacked segments. -->
									<div
										class={[
											'min-h-0.5 shrink-0 border-white not-last:border-t-2 dark:border-gray-800',
											s.color
										]}
										style:height="{(s.values[i] / totals[i]) * 100}%"
									></div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}

			{#if active !== null}
				<div
					class={[
						'pointer-events-none absolute bottom-full z-10 mb-2 min-w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md dark:border-gray-600 dark:bg-gray-700',
						tooltipAlign(active)
					]}
					style:left="{((active + 0.5) / days.length) * 100}%"
					aria-live="polite"
				>
					<p class="mb-1 font-medium text-gray-900 first-letter:uppercase dark:text-white">
						{longFormat.format(asDate(days[active]))}
					</p>
					{#if shown.length > 1}
						<ul class="space-y-0.5">
							{#each shown as s (s.key)}
								<li class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
									<span class={['h-0.5 w-3 rounded-full', s.color]} aria-hidden="true"></span>
									<span class="font-semibold text-gray-900 tabular-nums dark:text-white">
										{numberFormat.format(s.values[active])}
									</span>
									{s.label}
								</li>
							{/each}
						</ul>
						<p
							class="mt-1 border-t border-gray-200 pt-1 text-gray-600 dark:border-gray-600 dark:text-gray-300"
						>
							<span class="font-semibold text-gray-900 tabular-nums dark:text-white">
								{numberFormat.format(totals[active])}
							</span>
							{m.dashboard_chart_total()}
						</p>
					{:else}
						<p class="text-gray-600 dark:text-gray-300">
							<span class="text-sm font-semibold text-gray-900 tabular-nums dark:text-white">
								{numberFormat.format(totals[active])}
							</span>
							{series[0]?.label}
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if !compact}
		<div class="mt-1.5 flex pl-9 text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
			{#each days as day, i (day)}
				<span class="flex-1 overflow-visible text-center whitespace-nowrap">
					{(days.length - 1 - i) % labelEvery === 0 ? axisFormat.format(asDate(day)) : ''}
				</span>
			{/each}
		</div>
	{/if}

	<!-- The same numbers for screen readers (a wrapper: tables ignore the sr-only size). -->
	<div class="sr-only">
		<table>
			<caption>{label}</caption>
			<thead>
				<tr>
					<th scope="col">{m.dashboard_chart_day()}</th>
					{#each series as s (s.key)}
						<th scope="col">{s.label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each days as day, i (day)}
					<tr>
						<th scope="row">{longFormat.format(asDate(day))}</th>
						{#each series as s (s.key)}
							<td>{numberFormat.format(s.values[i])}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</figure>
