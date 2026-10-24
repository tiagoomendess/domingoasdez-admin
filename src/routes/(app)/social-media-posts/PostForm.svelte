<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import type { ResolvedPathname } from '$app/types';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import SelectField from '#lib/components/form/SelectField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { contentLabels, options, platformLabels, typeLabels } from './labels';

	export type PostValues = {
		platform: string;
		postType: string;
		postContentType: string;
		mediaPath: string | null;
		textContent: string | null;
		/** `datetime-local` value in the admin's timezone. */
		publishAt: string;
	};

	let {
		post,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		post: PostValues;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel} multipart>
	<Card size="xl" class="max-w-3xl p-6">
		<div class="grid gap-5 md:grid-cols-3">
			<SelectField
				name="platform"
				label={m.social_posts_platform()}
				value={post.platform}
				options={options(platformLabels)}
				required
			/>
			<SelectField
				name="post_type"
				label={m.social_posts_type()}
				value={post.postType}
				options={options(typeLabels)}
				required
			/>
			<SelectField
				name="post_content_type"
				label={m.social_posts_content()}
				value={post.postContentType}
				options={options(contentLabels)}
				required
			/>
			<TextField
				name="publish_at"
				type="datetime-local"
				label={m.social_posts_publish_at()}
				hint={m.social_posts_publish_at_hint()}
				value={post.publishAt}
				required
				class="md:col-span-3"
			/>
			<TextField
				name="media_path"
				type="url"
				label={m.social_posts_media_path()}
				hint={m.social_posts_media_path_hint()}
				value={post.mediaPath}
				maxlength={512}
				autocomplete="off"
				class="md:col-span-3"
			/>
			<div class="md:col-span-3">
				<ImageField
					name="image"
					label={m.social_posts_image()}
					hint={m.social_posts_image_hint()}
					current={post.postContentType === 'image' ? post.mediaPath : null}
					accept="image/jpeg,image/png"
				/>
			</div>
			<TextareaField
				name="text_content"
				label={m.social_posts_text()}
				hint={m.social_posts_text_hint()}
				value={post.textContent}
				maxlength={512}
				rows={4}
				class="md:col-span-3"
			/>
		</div>
	</Card>
</EntityForm>
