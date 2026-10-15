<script lang="ts">
	import { page } from '$app/state';
	import { DEFAULT_TIMEZONE, formatDateTime, isTimeZone } from '#lib/format.ts';
	import { getLocale } from '#lib/paraglide/runtime.js';

	let { value }: { value: Date | string | null | undefined } = $props();

	// The (app) layout provides the admin's timezone.
	const timeZone = $derived(
		isTimeZone(page.data.timezone) ? (page.data.timezone as string) : DEFAULT_TIMEZONE
	);
	const date = $derived(value ? new Date(value) : null);
</script>

{#if date && !Number.isNaN(date.getTime())}
	<time datetime={date.toISOString()} class="whitespace-nowrap">
		{formatDateTime(date, { timeZone, locale: getLocale() })}
	</time>
{/if}
