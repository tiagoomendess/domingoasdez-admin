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
	import { ArrowRightOutline } from 'flowbite-svelte-icons';
	import type { Component, Snippet } from 'svelte';
	import { formatNumber } from '#lib/format.ts';
	import { getLocale } from '#lib/paraglide/runtime.js';

	let {
		title,
		icon: Icon,
		tone,
		value,
		description,
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
		/** Footer link; leave it out when the admin can't open the section. */
		href?: string;
		linkLabel?: string;
		children?: Snippet;
	} = $props();
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
