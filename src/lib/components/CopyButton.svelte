<script lang="ts">
	import { CheckOutline, FileCopyOutline } from 'flowbite-svelte-icons';

	let {
		text,
		label,
		copiedLabel
	}: {
		/** What goes to the clipboard. */
		text: string;
		/** Accessible name and tooltip, e.g. "Copiar link". */
		label: string;
		copiedLabel: string;
	} = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<button
	type="button"
	class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-primary-300 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
	title={copied ? copiedLabel : label}
	aria-label={copied ? copiedLabel : label}
	onclick={copy}
>
	{#if copied}
		<CheckOutline class="size-4 text-green-600" aria-hidden="true" />
	{:else}
		<FileCopyOutline class="size-4" aria-hidden="true" />
	{/if}
</button>
