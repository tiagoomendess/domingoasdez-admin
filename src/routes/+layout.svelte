<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import './layout.css';

	let { children }: LayoutProps = $props();

	onMount(() => {
		// The admin's timezone, for the audit log (like the legacy backoffice) and date inputs.
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (timezone && !document.cookie.includes(`timezone=${encodeURIComponent(timezone)}`)) {
			document.cookie = `timezone=${encodeURIComponent(timezone)}; path=/; max-age=31536000; samesite=lax`;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
