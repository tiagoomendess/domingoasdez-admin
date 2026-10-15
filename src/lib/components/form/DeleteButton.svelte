<script lang="ts">
	import { Alert, Button, Modal } from 'flowbite-svelte';
	import { ExclamationCircleOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';

	let {
		action = '?/delete',
		title,
		label = m.form_delete(),
		children
	}: {
		/** Form action that deletes the entity and redirects (to the list). */
		action?: string;
		/** e.g. "Delete club FC Exemplo?" */
		title: string;
		label?: string;
		/** Extra warning (what else is removed). */
		children?: Snippet;
	} = $props();

	let open = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
</script>

<Button
	color="red"
	outline
	class="gap-2"
	onclick={() => {
		error = null;
		open = true;
	}}
>
	<TrashBinOutline class="size-4" aria-hidden="true" />
	{label}
</Button>

<!-- Not inside the entity's form: nested forms are invalid HTML. -->
<!-- No corner "×" (Flowbite labels it "Close"): Cancel, Escape and a click outside close it. -->
<Modal
	bind:open
	size="sm"
	dismissable={false}
	permanent={submitting}
	aria-labelledby="delete-title"
>
	<div class="text-center">
		<ExclamationCircleOutline
			class="mx-auto mb-4 size-12 text-red-600 dark:text-red-500"
			aria-hidden="true"
		/>
		<h3 id="delete-title" class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
			{title}
		</h3>
		<p class="text-sm text-gray-500 dark:text-gray-400">{m.form_delete_warning()}</p>
		{#if children}
			<div class="mt-3 text-sm text-gray-700 dark:text-gray-300">{@render children()}</div>
		{/if}
		{#if error}
			<Alert color="red" class="mt-4 text-left dark:bg-gray-800 dark:text-red-400">{error}</Alert>
		{/if}

		<form
			method="POST"
			{action}
			class="mt-6 flex justify-center gap-3"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'failure') {
						const message = result.data?.message;
						error = typeof message === 'string' ? message : m.error_generic();
						return;
					}
					open = false;
					await update();
				};
			}}
		>
			<Button
				type="button"
				color="alternative"
				disabled={submitting}
				onclick={() => (open = false)}
			>
				{m.form_cancel()}
			</Button>
			<!-- Focus starts on "Cancel" (first button), so Enter never deletes by accident. -->
			<Button type="submit" color="red" loading={submitting}>
				{m.form_delete_confirm()}
			</Button>
		</form>
	</div>
</Modal>
