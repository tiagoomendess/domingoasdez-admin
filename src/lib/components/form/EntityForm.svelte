<script lang="ts">
	import { Alert } from 'flowbite-svelte';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
	import { tick, type Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import type { ResolvedPathname } from '$app/types';
	import { isFormFailure } from '#lib/forms.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { setFormContext } from './context';
	import SaveBar from './SaveBar.svelte';

	let {
		form,
		action,
		multipart = false,
		readonly = false,
		cancelHref,
		submitLabel = m.form_save(),
		children
	}: {
		/** The page's `form` prop (last action result). */
		form: unknown;
		/** e.g. `?/save`; the default action when omitted. */
		action?: string;
		/** Needed for file inputs. */
		multipart?: boolean;
		/** Show the values without letting the admin change them (no `.edit` permission). */
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
		children: Snippet;
	} = $props();

	const failure = $derived(isFormFailure(form) ? form : null);
	setFormContext({
		get failure() {
			return failure;
		},
		get readonly() {
			return readonly;
		}
	});

	let element = $state<HTMLFormElement>();
	let submitting = $state(false);

	const hasFieldErrors = $derived(
		failure !== null && Object.values(failure.errors).some((errors) => errors?.length)
	);
</script>

<form
	bind:this={element}
	method="POST"
	{action}
	enctype={multipart ? 'multipart/form-data' : undefined}
	novalidate
	use:enhance={() => {
		submitting = true;
		return async ({ update, result }) => {
			await update({ reset: false });
			submitting = false;
			if (result.type === 'redirect') {
				// The page component survives a redirect to itself: drop uploaded files so the
				// next save doesn't send them again. A new empty FileList (clearing `value` keeps
				// the same object, which `bind:files` would not notice) also resets previews.
				for (const input of element?.querySelectorAll<HTMLInputElement>('input[type="file"]') ??
					[]) {
					input.files = new DataTransfer().files;
					input.dispatchEvent(new Event('change', { bubbles: true }));
				}
			} else if (result.type === 'failure') {
				await tick();
				// Take the admin to the first problem.
				const target =
					element?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
					element?.querySelector<HTMLElement>('[role="alert"]');
				target?.focus({ preventScroll: true });
				target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
			}
		};
	}}
>
	{#if failure && (failure.message || hasFieldErrors)}
		<Alert
			color="red"
			class="mb-6 flex items-center gap-2 dark:bg-gray-800 dark:text-red-400"
			tabindex={-1}
		>
			<ExclamationCircleOutline class="size-5 shrink-0" aria-hidden="true" />
			<span>{failure.message ?? m.form_has_errors()}</span>
		</Alert>
	{/if}

	<fieldset disabled={readonly} class="contents">
		{@render children()}
	</fieldset>

	{#if !readonly}
		<SaveBar {cancelHref} {submitLabel} {submitting} />
	{/if}
</form>
