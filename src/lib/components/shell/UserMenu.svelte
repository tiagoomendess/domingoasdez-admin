<script lang="ts">
	import { Dropdown, DropdownGroup, DropdownHeader, DropdownItem } from 'flowbite-svelte';
	import { ArrowRightToBracketOutline, ArrowUpRightFromSquareOutline } from 'flowbite-svelte-icons';
	import { PUBLIC_FRONTEND_URL } from '$app/env/public';
	import type { AdminUser } from '#lib/auth/user.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { user }: { user: AdminUser } = $props();
</script>

<button
	id="user-menu-button"
	type="button"
	class="rounded-full focus:ring-4 focus:ring-white/40 focus:outline-none"
	aria-label={m.user_menu_open()}
>
	<!-- Plain <img>: Flowbite Avatar spreads props onto it, so SSR adds inline onload/onerror
	     replay handlers that the CSP blocks. The server already falls back to a default picture. -->
	<img
		src={user.picture}
		alt=""
		class="size-8 rounded-full bg-gray-100 object-cover dark:bg-gray-600"
		width="32"
		height="32"
	/>
</button>

<Dropdown triggeredBy="#user-menu-button" placement="bottom-end" class="w-60">
	<DropdownHeader>
		<span class="block truncate font-medium">{user.name}</span>
		<span class="block truncate text-gray-500 dark:text-gray-400">{user.email}</span>
	</DropdownHeader>
	<DropdownGroup>
		<DropdownItem href={PUBLIC_FRONTEND_URL} target="_blank" rel="noopener" class="flex gap-2">
			<ArrowUpRightFromSquareOutline class="size-5" aria-hidden="true" />
			{m.user_menu_back_to_site()}
		</DropdownItem>
		<li>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="flex w-full gap-2 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
				>
					<ArrowRightToBracketOutline class="size-5" aria-hidden="true" />
					{m.user_menu_logout()}
				</button>
			</form>
		</li>
	</DropdownGroup>
</Dropdown>
