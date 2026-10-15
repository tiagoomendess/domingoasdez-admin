<script lang="ts">
	import { Fileupload } from 'flowbite-svelte';
	import { ImageOutline } from 'flowbite-svelte-icons';
	import { m } from '#lib/paraglide/messages.js';
	import FormField from './FormField.svelte';

	let {
		name,
		label,
		current,
		accept,
		hint,
		square = false
	}: {
		name: string;
		label: string;
		/** URL of the stored image, shown until a new file is picked. */
		current?: string | null;
		/** e.g. `image/png,image/svg+xml`. */
		accept: string;
		hint?: string;
		/** Preview as a square (emblems, photos) instead of the image's own shape. */
		square?: boolean;
	} = $props();

	let files = $state<FileList>();
	let preview = $state<string | null>(null);

	// Preview the picked file locally (blob: URLs are allowed by the CSP); revoked on change/unmount.
	$effect(() => {
		const file = files?.[0];
		const url = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
		preview = url;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	const shown = $derived(preview ?? current ?? null);
</script>

<FormField {name} {label} {hint}>
	{#snippet children(field)}
		<div class="flex items-center gap-4">
			<div
				class={[
					'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700',
					square ? 'size-20' : 'h-20 w-32'
				]}
			>
				{#if shown}
					<img
						src={shown}
						alt={preview ? m.form_image_new_preview() : m.form_image_current()}
						class="max-h-full max-w-full object-contain"
					/>
				{:else}
					<ImageOutline class="size-8 text-gray-300 dark:text-gray-500" aria-hidden="true" />
				{/if}
			</div>
			<Fileupload
				bind:files
				id={field.id}
				{name}
				{accept}
				aria-invalid={field.invalid || undefined}
				aria-describedby={field.describedBy}
				class="flex-1"
			/>
		</div>
	{/snippet}
</FormField>
