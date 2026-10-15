<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import FlashToast from '#lib/components/FlashToast.svelte';
	import SideNav from '#lib/components/shell/SideNav.svelte';
	import TopBar from '#lib/components/shell/TopBar.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let menuOpen = $state(false);

	afterNavigate(() => {
		menuOpen = false;
	});
</script>

<TopBar user={data.user} {menuOpen} onToggleMenu={() => (menuOpen = !menuOpen)} />

<SideNav
	user={data.user}
	pathname={page.url.pathname}
	backgroundImage={data.sidenavImage}
	open={menuOpen}
	onClose={() => (menuOpen = false)}
/>

<FlashToast flash={data.flash} />

<main class="min-h-dvh pt-16 lg:ps-72">
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{@render children()}
	</div>
</main>
