<script lang="ts">
	import { BarsOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import type { AdminUser } from '#lib/auth/user.ts';
	import { m } from '#lib/paraglide/messages.js';
	import ThemeToggle from './ThemeToggle.svelte';
	import UserMenu from './UserMenu.svelte';

	let {
		user,
		menuOpen,
		onToggleMenu
	}: { user: AdminUser; menuOpen: boolean; onToggleMenu: () => void } = $props();
</script>

<!-- Same layout as the legacy backoffice: blue top bar, centred site name, actions on the right. -->
<header
	class="fixed inset-x-0 top-0 z-30 h-16 bg-primary-700 text-white shadow-md lg:ps-72 dark:border-b dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex h-full items-center gap-2 px-2 sm:px-4">
		<button
			type="button"
			class="inline-flex size-10 items-center justify-center rounded-lg hover:bg-white/10 focus:ring-2 focus:ring-white/40 focus:outline-none lg:hidden"
			aria-label={m.nav_toggle_menu()}
			aria-controls="sidenav"
			aria-expanded={menuOpen}
			onclick={onToggleMenu}
		>
			<BarsOutline class="size-6" aria-hidden="true" />
		</button>

		<a
			href={resolve('/(app)')}
			class="min-w-0 flex-1 truncate text-center text-xl font-extralight sm:text-2xl"
		>
			{m.app_name()}
		</a>

		<div class="flex items-center gap-1">
			<ThemeToggle class="hover:bg-white/10 focus:ring-white/40" />
			<UserMenu {user} />
		</div>
	</div>
</header>
