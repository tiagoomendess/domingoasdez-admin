<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import type { ResolvedPathname } from '$app/types';
	import { can, type Permission } from '#lib/auth/permissions.ts';

	let {
		href,
		label,
		granted,
		permission
	}: {
		href: ResolvedPathname;
		label: string;
		/** The signed-in admin's permissions (`data.user.permissions`). */
		granted: string[];
		/** Usually `<resource>.create`. The button is not rendered without it. */
		permission: Permission;
	} = $props();
</script>

{#if can(granted, permission)}
	<Button {href} class="gap-2">
		<PlusOutline class="size-4" aria-hidden="true" />
		{label}
	</Button>
{/if}
