<script lang="ts">
	import { onMount } from 'svelte';
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
	<!-- Same icons as the public site (domingoasdez-app). -->
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
	<link rel="icon" href="/favicon-48x48.png" type="image/png" sizes="48x48" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
</svelte:head>

{@render children()}
