<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { FloppyDiskOutline } from 'flowbite-svelte-icons';
	import type { ResolvedPathname } from '$app/types';
	import { m } from '#lib/paraglide/messages.js';

	let {
		cancelHref,
		submitLabel = m.form_save(),
		submitting = false
	}: {
		cancelHref: ResolvedPathname;
		submitLabel?: string;
		submitting?: boolean;
	} = $props();
</script>

<!-- Stays visible at the bottom of long forms. -->
<div
	class="sticky bottom-0 z-10 -mx-4 mt-8 flex justify-end gap-3 border-t border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-gray-700 dark:bg-gray-900/95"
>
	<Button href={cancelHref} color="alternative">{m.form_cancel()}</Button>
	<Button type="submit" loading={submitting} class="gap-2">
		{#if !submitting}<FloppyDiskOutline class="size-4" aria-hidden="true" />{/if}
		{submitLabel}
	</Button>
</div>
