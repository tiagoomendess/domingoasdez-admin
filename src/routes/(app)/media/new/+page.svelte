<script lang="ts">
	import { Card, Fileupload } from 'flowbite-svelte';
	import { LinkOutline, UploadOutline } from 'flowbite-svelte-icons';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	type Source = 'file' | 'url';
	// After a rejected link, reopen on the link tab.
	let source = $state<Source>(
		untrack(() =>
			(form as { values?: Record<string, string> } | null)?.values?.source === 'url'
				? 'url'
				: 'file'
		)
	);

	const sources: { value: Source; label: string; icon: typeof UploadOutline }[] = [
		{ value: 'file', label: m.media_source_file(), icon: UploadOutline },
		{ value: 'url', label: m.media_source_url(), icon: LinkOutline }
	];
</script>

<PageHeader title={m.media_new()} back={resolve('/(app)/media')} backLabel={m.media_title()} />

<EntityForm {form} cancelHref={resolve('/(app)/media')} submitLabel={m.form_create()} multipart>
	<Card size="xl" class="max-w-3xl space-y-5 p-6">
		<fieldset>
			<legend class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
				{m.media_source()}
			</legend>
			<div class="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-600">
				{#each sources as option (option.value)}
					<label
						class={[
							'flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-primary-300',
							source === option.value
								? 'bg-primary-700 text-white'
								: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
						]}
					>
						<input
							type="radio"
							name="source"
							value={option.value}
							class="sr-only"
							bind:group={source}
						/>
						<option.icon class="size-4" aria-hidden="true" />
						{option.label}
					</label>
				{/each}
			</div>
		</fieldset>

		{#if source === 'file'}
			<FormField name="file" label={m.media_file()} hint={m.media_file_hint()} required>
				{#snippet children(field)}
					<Fileupload
						id={field.id}
						name="file"
						aria-invalid={field.invalid || undefined}
						aria-describedby={field.describedBy}
					/>
				{/snippet}
			</FormField>
		{:else}
			<TextField
				name="url"
				type="url"
				label={m.media_url()}
				hint={m.media_url_hint()}
				placeholder="https://"
				maxlength={255}
				required
			/>
		{/if}

		<TextField
			name="tags"
			label={m.media_tags()}
			hint={m.media_tags_hint()}
			maxlength={255}
			required
			autocomplete="off"
		/>
		<ToggleField name="visible" label={m.common_visible()} hint={m.media_visible_hint()} checked />
	</Card>
</EntityForm>
