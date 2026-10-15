<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import RichTextField from '#lib/components/form/RichTextField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import { m } from '#lib/paraglide/messages.js';

	export type PageValues = {
		title: string;
		name: string;
		/** Body HTML with upload paths turned into loadable URLs. */
		body: string;
		visible: boolean;
	};

	let {
		page,
		picture,
		canUpload,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		page: PageValues;
		/** Display URL of the stored picture, if any. */
		picture: string | null;
		/** Images can be uploaded into the body (`media` permission, as on the legacy site). */
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
				label={m.pages_title_field()}
				hint={m.pages_title_hint()}
				value={page.title}
				required
				maxlength={155}
				autocomplete="off"
			/>
			<RichTextField
				name="body"
				label={m.pages_body()}
				value={page.body}
				required
				uploadUrl={canUpload ? resolve('/api/editor/images') : undefined}
			/>
		</Card>

		<div class="space-y-6">
			<Card size="xl" class="space-y-4 p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.pages_section_options()}</Heading>
				<TextField
					name="name"
					label={m.pages_name()}
					hint={m.pages_name_hint()}
					value={page.name}
					required
					maxlength={50}
					autocomplete="off"
				/>
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.pages_visible_hint()}
					checked={page.visible}
				/>
			</Card>

			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-5 text-lg font-medium">{m.pages_picture()}</Heading>
				<ImageField
					name="picture"
					label={picture ? m.pages_picture_new() : m.pages_picture_file()}
					current={picture}
					accept="image/jpeg,image/png"
					hint={m.pages_picture_hint()}
				/>
			</Card>
		</div>
	</div>
</EntityForm>
