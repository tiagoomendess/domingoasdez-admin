<script lang="ts">
	import { Toast } from 'flowbite-svelte';
	import { CheckCircleOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import type { Flash } from '#lib/flash.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { flash }: { flash: Flash | null } = $props();

	const VISIBLE_MS = 5000;

	let current = $state<Flash | null>(null);
	let open = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Every load that brings a message shows it again, even if the text is the same. A later load
	// without a message leaves the visible toast to its own timer.
	$effect(() => {
		if (!flash) return;
		current = flash;
		open = true;
		clearTimeout(timer);
		timer = setTimeout(() => (open = false), VISIBLE_MS);
	});

	onDestroy(() => clearTimeout(timer));
</script>

<div
	class="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex justify-center sm:inset-x-auto sm:end-6"
>
	{#if current}
		<Toast
			bind:toastStatus={open}
			color={current.type === 'success' ? 'green' : 'red'}
			transition={fly}
			params={{ y: 16, duration: 200 }}
			closeAriaLabel={m.toast_close()}
			class="pointer-events-auto w-full max-w-sm shadow-lg"
			role={current.type === 'success' ? 'status' : 'alert'}
		>
			{#snippet icon()}
				{#if current?.type === 'success'}
					<CheckCircleOutline class="size-5" aria-hidden="true" />
				{:else}
					<ExclamationCircleOutline class="size-5" aria-hidden="true" />
				{/if}
			{/snippet}
			{current.message}
		</Toast>
	{/if}
</div>
