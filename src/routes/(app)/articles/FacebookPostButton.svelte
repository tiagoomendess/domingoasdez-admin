<script lang="ts">
	import { Alert, Button, Helper, Label, Modal, Spinner, Textarea } from 'flowbite-svelte';
	import { DownloadOutline, FacebookSolid } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	/** Legacy `postOnFacebook`: `message` max 280. */
	const MESSAGE_MAX = 280;

	let {
		article,
		compact = false
	}: {
		article: { id: number; title: string; visible: boolean };
		/** Icon only, for the list rows (legacy "f" button). */
		compact?: boolean;
	} = $props();

	let open = $state(false);
	let message = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let preview = $state<'loading' | 'ready' | 'failed'>('loading');

	const imageUrl = $derived(resolve('/(app)/articles/[id=id]/social-image', { id: article.id }));
	const titleId = $derived(`facebook-post-title-${article.id}`);
	const messageId = $derived(`facebook-post-message-${article.id}`);

	function show() {
		message = '';
		error = null;
		preview = 'loading';
		open = true;
	}
</script>

{#if compact}
	<button
		type="button"
		class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[#1877f2] focus:ring-2 focus:ring-primary-300 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
		title={m.articles_facebook_post()}
		aria-label={m.articles_facebook_post()}
		onclick={show}
	>
		<FacebookSolid class="size-4" aria-hidden="true" />
	</button>
{:else}
	<Button color="alternative" class="gap-2" onclick={show}>
		<FacebookSolid class="size-4 text-[#1877f2] dark:text-white" aria-hidden="true" />
		{m.articles_facebook_post()}
	</Button>
{/if}

<!-- No corner "×" (Flowbite labels it "Close"): Cancel, Escape and a click outside close it. -->
<Modal bind:open size="lg" dismissable={false} permanent={submitting} aria-labelledby={titleId}>
	<h3 id={titleId} class="text-lg font-semibold text-gray-900 dark:text-white">
		{m.articles_facebook_post()}
	</h3>
	<p class="-mt-2 text-sm text-gray-500 dark:text-gray-400">{article.title}</p>

	<div class="flex flex-col gap-6 sm:flex-row">
		<div class="mx-auto w-56 shrink-0 sm:mx-0">
			<div
				class="relative aspect-[4/5] overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700"
			>
				{#if preview !== 'failed'}
					<img
						src={imageUrl}
						alt={m.articles_facebook_preview_alt()}
						class="size-full object-cover"
						onload={() => (preview = 'ready')}
						onerror={() => (preview = 'failed')}
					/>
				{/if}
				{#if preview === 'loading'}
					<div class="absolute inset-0 flex items-center justify-center">
						<Spinner size="8" />
					</div>
				{:else if preview === 'failed'}
					<p
						class="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-500 dark:text-gray-400"
					>
						{m.articles_facebook_preview_failed()}
					</p>
				{/if}
			</div>
			{#if preview === 'ready'}
				<Button
					href={`${imageUrl}?download`}
					color="alternative"
					size="xs"
					class="mt-2 w-full gap-2"
				>
					<DownloadOutline class="size-4" aria-hidden="true" />
					{m.articles_facebook_download()}
				</Button>
			{/if}
		</div>

		<form
			method="POST"
			action={`${resolve('/(app)/articles/[id=id]', { id: article.id })}?/facebook`}
			class="flex min-w-0 flex-1 flex-col gap-4"
			use:enhance={() => {
				submitting = true;
				error = null;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'failure') {
						const data = result.data as
							{ message?: unknown; errors?: Record<string, string[] | undefined> } | undefined;
						error =
							typeof data?.message === 'string'
								? data.message
								: (data?.errors?.message?.[0] ?? m.error_generic());
						return;
					}
					if (result.type === 'error') {
						error = m.error_generic();
						return;
					}
					open = false;
					await update();
				};
			}}
		>
			<p class="text-sm text-gray-700 dark:text-gray-300">{m.articles_facebook_intro()}</p>

			{#if !article.visible}
				<Alert color="yellow" class="dark:bg-gray-800 dark:text-yellow-300">
					{m.articles_facebook_hidden()}
				</Alert>
			{/if}

			<div>
				<Label for={messageId} class="mb-2">{m.articles_facebook_message()}</Label>
				<Textarea
					id={messageId}
					name="message"
					rows={4}
					maxlength={MESSAGE_MAX}
					bind:value={message}
					class="w-full"
					aria-describedby={`${messageId}-hint`}
				/>
				<Helper id={`${messageId}-hint`} class="mt-1 flex justify-between gap-4">
					<span>{m.articles_facebook_message_hint()}</span>
					<span class="shrink-0 tabular-nums">{message.length}/{MESSAGE_MAX}</span>
				</Helper>
			</div>

			{#if error}
				<Alert color="red" class="dark:bg-gray-800 dark:text-red-400">{error}</Alert>
			{/if}

			<div class="mt-auto flex justify-end gap-3">
				<Button
					type="button"
					color="alternative"
					disabled={submitting}
					onclick={() => (open = false)}
				>
					{m.form_cancel()}
				</Button>
				<Button type="submit" color="primary" class="gap-2" loading={submitting}>
					<FacebookSolid class="size-4" aria-hidden="true" />
					{m.articles_facebook_publish()}
				</Button>
			</div>
		</form>
	</div>
</Modal>
