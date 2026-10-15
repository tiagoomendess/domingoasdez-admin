<script lang="ts">
	import { CheckOutline, LinkOutline } from 'flowbite-svelte-icons';
	import { m } from '#lib/paraglide/messages.js';

	let { url }: { url: string } = $props();

	let copied = $state(false);

	/** Legacy list: copies the public link of the poll to share it. */
	async function copy() {
		await navigator.clipboard.writeText(url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<button
	type="button"
	class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-primary-300 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
	title={copied ? m.polls_link_copied() : m.polls_copy_link()}
	aria-label={copied ? m.polls_link_copied() : m.polls_copy_link()}
	onclick={copy}
>
	{#if copied}
		<CheckOutline class="size-4 text-green-600" aria-hidden="true" />
	{:else}
		<LinkOutline class="size-4" aria-hidden="true" />
	{/if}
</button>
