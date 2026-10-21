<script lang="ts" module>
	/** Icon colours, echoing the legacy dashboard cards. */
	const tones = {
		orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
		red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
		purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
		blue: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
		amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
		green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
		violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
		cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
		teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
	} as const;

	export type StatTone = keyof typeof tones;
</script>

<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import { ArrowDownOutline, ArrowRightOutline, ArrowUpOutline } from 'flowbite-svelte-icons';
	import type { Component, Snippet } from 'svelte';
	import { formatNumber } from '#lib/format.ts';
	import { getLocale } from '#lib/paraglide/runtime.js';

	let {
		title,
		icon: Icon,
		tone,
		value,
		description,
		comparison,
		href,
		linkLabel,
		children
	}: {
		title: string;
		icon: Component;
		tone: StatTone;
		/** The metric. Omit it to render `children` (a list) instead. */
		value?: number;
		description?: string;
		/**
		 * Change of `value` against an earlier one. `upIsGood` colours it green/red; without it the
		 * change is neutral (e.g. more reports to review is neither good nor bad).
		 */
		comparison?: { previous: number; label: string; upIsGood?: boolean };
		/** Footer link; leave it out when the admin can't open the section. */
		href?: string;
		linkLabel?: string;
		children?: Snippet;
	} = $props();

	/** Whole-percent change, or null when there is nothing to compare with. */
	const change = $derived(
		comparison && value !== undefined && comparison.previous > 0
			? Math.round(((value - comparison.previous) / comparison.previous) * 100)
			: null
	);
	const changeTone = $derived(
		change === null || change === 0 || comparison?.upIsGood === undefined
			? 'text-gray-600 dark:text-gray-400'
			: change > 0 === comparison.upIsGood
				? 'text-green-700 dark:text-green-400'
				: 'text-red-700 dark:text-red-400'
	);
</script>

<Card size="xl" class="h-full flex-col p-5">
	<div class="flex items-start justify-between gap-4">
		<h2 class="text-sm font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
			{title}
		</h2>
		<span class={['flex size-10 shrink-0 items-center justify-center rounded-lg', tones[tone]]}>
			<Icon class="size-5" aria-hidden="true" />
		</span>
	</div>

	{#if value !== undefined}
		<p class="mt-2 text-4xl font-bold text-gray-900 tabular-nums dark:text-white">
			{formatNumber(value, getLocale())}
		</p>
	{/if}
	{#if description}
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
	{/if}
	{#if change !== null && comparison}
		<p class="mt-1 flex items-center gap-1 text-sm">
			<span class={['inline-flex items-center gap-0.5 font-semibold', changeTone]}>
				{#if change > 0}
					<ArrowUpOutline class="size-3.5" aria-hidden="true" />
				{:else if change < 0}
					<ArrowDownOutline class="size-3.5" aria-hidden="true" />
				{/if}
				{change > 0 ? '+' : ''}{formatNumber(change, getLocale())}%
			</span>
			<span class="text-gray-500 dark:text-gray-400">{comparison.label}</span>
		</p>
	{/if}
	{#if children}
		<div class="mt-3">{@render children()}</div>
	{/if}

	{#if href && linkLabel}
		<div class="mt-auto pt-4">
			<Button {href} color="alternative" size="sm" class="w-full gap-2">
				{linkLabel}
				<ArrowRightOutline class="size-4" aria-hidden="true" />
			</Button>
		</div>
	{/if}
</Card>
