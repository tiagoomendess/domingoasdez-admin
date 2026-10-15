<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import RichTextField from '#lib/components/form/RichTextField.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import { formatDate } from '#lib/format.ts';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	export type ArticleValues = {
		title: string;
		description: string | null;
		/** Body HTML with upload paths turned into loadable URLs. */
		text: string;
		/** `YYYY-MM-DD`. */
		date: string;
		tags: string | null;
		visible: boolean;
	};

	let {
		article,
		cover,
		creating = false,
		canUpload,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		article: ArticleValues;
		/** The current cover (media library item). */
		cover: Option | null;
		/** The date can only be set when the article is created. */
		creating?: boolean;
		/** Images can be uploaded into the text (`media` permission, as on the legacy site). */
		canUpload: boolean;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel} multipart>
	<div class="grid gap-6 xl:grid-cols-3">
		<Card size="xl" class="space-y-5 p-6 xl:col-span-2">
			<TextField
				name="title"
				label={m.articles_title_field()}
				hint={creating ? undefined : m.articles_title_hint()}
				value={article.title}
				required
				maxlength={155}
				autocomplete="off"
			/>
			<TextareaField
				name="description"
				label={m.articles_description()}
				hint={m.articles_description_hint()}
				value={article.description}
				maxlength={280}
				rows={3}
			/>
			<RichTextField
				name="text"
				label={m.articles_text()}
				value={article.text}
				required
				uploadUrl={canUpload ? resolve('/api/editor/images') : undefined}
			/>
		</Card>

		<div class="space-y-6">
			<Card size="xl" class="space-y-4 p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.articles_section_publish()}</Heading>
				{#if creating}
					<TextField
						name="date"
						type="date"
						label={m.articles_date()}
						value={article.date}
						required
					/>
				{:else}
					<div>
						<p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
							{m.articles_date()}
						</p>
						<p class="text-gray-700 dark:text-gray-300">{formatDate(article.date, getLocale())}</p>
					</div>
				{/if}
				<TextField
					name="tags"
					label={m.articles_tags()}
					hint={m.articles_tags_hint()}
					value={article.tags}
					maxlength={280}
					autocomplete="off"
				/>
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.articles_visible_hint()}
					checked={article.visible}
				/>
			</Card>

			<Card size="xl" class="space-y-5 p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.articles_cover()}</Heading>
				<FormField
					name="media_id"
					label={m.articles_cover_media()}
					hint={m.articles_cover_media_hint()}
				>
					{#snippet children(field)}
						<SearchSelect
							id={field.id}
							name="media_id"
							endpoint={resolve('/api/options/media')}
							value={cover}
							label={m.articles_cover_media()}
							placeholder={m.select_search_media()}
							invalid={field.invalid}
							describedBy={field.describedBy}
							disabled={readonly}
						/>
					{/snippet}
				</FormField>
				<ImageField
					name="cover"
					label={m.articles_cover_upload()}
					accept="image/jpeg,image/png"
					hint={m.articles_cover_upload_hint()}
				/>
			</Card>
		</div>
	</div>
</EntityForm>
