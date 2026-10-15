<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import type { ResolvedPathname } from '$app/types';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import { m } from '#lib/paraglide/messages.js';

	export type PartnerValues = {
		name: string;
		url: string;
		priority: number;
		visible: boolean;
	};

	let {
		partner,
		picture,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		partner: PartnerValues;
		/** Display URL of the stored picture; `null` on create, where it must be uploaded. */
		picture: string | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel} multipart>
	<div class="grid gap-6 xl:grid-cols-3">
		<Card size="xl" class="p-6 xl:col-span-2">
			<Heading tag="h2" class="mb-5 text-lg font-medium">{m.partners_section_details()}</Heading>
			<div class="grid gap-5 md:grid-cols-3">
				<TextField
					name="name"
					label={m.common_name()}
					value={partner.name}
					required
					maxlength={50}
					autocomplete="off"
					class="md:col-span-2"
				/>
				<TextField
					name="priority"
					type="number"
					label={m.partners_priority()}
					hint={m.partners_priority_hint()}
					value={partner.priority}
					required
					min={1}
					max={100}
					step={1}
				/>
				<TextField
					name="url"
					type="url"
					label={m.partners_url()}
					hint={m.partners_url_hint()}
					value={partner.url}
					required
					maxlength={150}
					placeholder="https://"
					class="md:col-span-3"
				/>
			</div>
		</Card>

		<div class="space-y-6">
			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-5 text-lg font-medium">{m.partners_picture()}</Heading>
				<ImageField
					name="picture"
					label={picture === null ? m.partners_picture_file() : m.partners_picture_new()}
					current={picture}
					accept="image/jpeg,image/png"
					hint={m.partners_picture_hint()}
				/>
			</Card>

			<Card size="xl" class="space-y-4 p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.partners_section_options()}</Heading>
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.partners_visible_hint()}
					checked={partner.visible}
				/>
			</Card>
		</div>
	</div>
</EntityForm>
