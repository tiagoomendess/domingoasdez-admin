<script lang="ts">
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import { slide } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import type { AdminUser } from '#lib/auth/user.ts';
	import {
		dashboardIcon as DashboardIcon,
		dashboardItem,
		isActive,
		visibleNavigation,
		type NavGroup
	} from '#lib/navigation.ts';

	let {
		user,
		pathname,
		backgroundImage,
		open,
		onClose
	}: {
		user: AdminUser;
		pathname: string;
		/** Header picture of the legacy sidenav (`/images/sidenav_image.jpg`). */
		backgroundImage: string | null;
		open: boolean;
		onClose: () => void;
	} = $props();

	const groups = $derived(visibleNavigation(user.permissions));

	// Groups the admin toggled by hand; the others follow the current page.
	let toggled = $state<Record<string, boolean>>({});

	const containsActive = (group: NavGroup) =>
		group.items.some((item) => isActive(pathname, item.href));
	const isExpanded = (group: NavGroup) => toggled[group.label()] ?? containsActive(group);

	const linkClass = (active: boolean) =>
		[
			'flex items-center rounded-lg px-3 py-2 text-sm',
			active
				? 'bg-primary-50 font-medium text-primary-800 dark:bg-gray-700 dark:text-white'
				: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
		].join(' ');
</script>

<svelte:window onkeydown={(event) => open && event.key === 'Escape' && onClose()} />

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
		aria-hidden="true"
		tabindex="-1"
		onclick={onClose}
	></button>
{/if}

<aside
	id="sidenav"
	class={[
		'fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-gray-200 bg-white transition-[translate,visibility] duration-200 lg:visible lg:translate-x-0 dark:border-gray-700 dark:bg-gray-800',
		// Off-screen on small screens until opened; `invisible` keeps it out of the tab order.
		open ? 'translate-x-0' : 'invisible -translate-x-full'
	]}
>
	<!-- Legacy "user-view": picture background with the admin's avatar, name and email. -->
	<div class="relative shrink-0 overflow-hidden bg-primary-800 px-4 pt-6 pb-4 text-white">
		{#if backgroundImage}
			<img src={backgroundImage} alt="" class="absolute inset-0 size-full object-cover" />
			<div class="absolute inset-0 bg-linear-to-t from-gray-900/80 to-gray-900/10"></div>
		{/if}
		<div class="relative">
			<img
				src={user.picture}
				alt=""
				class="size-16 rounded-full object-cover ring-2 ring-white/80"
			/>
			<p class="mt-3 truncate font-medium">{user.name}</p>
			<p class="truncate text-sm text-white/80">{user.email}</p>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu">
		<a
			href={resolve(dashboardItem.href as Path)}
			class={linkClass(isActive(pathname, dashboardItem.href))}
			aria-current={isActive(pathname, dashboardItem.href) ? 'page' : undefined}
		>
			<DashboardIcon class="me-3 size-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
			{dashboardItem.label()}
		</a>

		<hr class="my-3 border-gray-200 dark:border-gray-700" />

		<ul class="space-y-1">
			{#each groups as group (group.label())}
				{@const expanded = isExpanded(group)}
				{@const id = `nav-group-${group.label()}`}
				<li>
					<button
						type="button"
						class="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
						aria-expanded={expanded}
						aria-controls={id}
						onclick={() => (toggled[group.label()] = !expanded)}
					>
						<group.icon class="me-3 size-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
						<span class="flex-1 text-left">{group.label()}</span>
						<ChevronDownOutline
							class={['size-4 transition-transform', expanded && 'rotate-180']}
							aria-hidden="true"
						/>
					</button>
					{#if expanded}
						<ul {id} class="mt-1 space-y-1 ps-8" transition:slide={{ duration: 150 }}>
							{#each group.items as item (item.href)}
								{@const active = isActive(pathname, item.href)}
								<li>
									<a
										href={resolve(item.href as Path)}
										class={linkClass(active)}
										aria-current={active ? 'page' : undefined}
									>
										{item.label()}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
</aside>
