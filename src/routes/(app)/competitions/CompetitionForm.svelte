<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import type { ResolvedPathname } from '$app/types';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import { m } from '#lib/paraglide/messages.js';

	export type CompetitionValues = {
		name: string;
		priority: number;
		visible: boolean;
		socialMediaEnabled: boolean;
	};

	let {
		competition,
		picture,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		competition: CompetitionValues;
		/** Display URL of the stored logo (null on create, where it is required). */
		picture: string | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel} multipart>
	<div class="grid items-start gap-6 xl:grid-cols-3">
		<Card size="xl" class="p-6 xl:col-span-2">
			<div class="grid gap-5 md:grid-cols-2">
				<TextField
					name="name"
					label={m.common_name()}
					value={competition.name}
					required
					maxlength={155}
					autocomplete="off"
					class="md:col-span-2"
				/>
				<TextField
					name="priority"
					type="number"
					label={m.competitions_priority()}
					hint={m.competitions_priority_hint()}
					value={competition.priority}
					required
					min={0}
					max={100000}
				/>
				<div class="space-y-4 md:col-span-2">
					<ToggleField
						name="visible"
						label={m.common_visible()}
						hint={m.competitions_visible_hint()}
						checked={competition.visible}
					/>
					<ToggleField
						name="social_media_enabled"
						label={m.competitions_social_media()}
						hint={m.competitions_social_media_hint()}
						checked={competition.socialMediaEnabled}
					/>
				</div>
			</div>
		</Card>
		<Card size="xl" class="p-6">
			<ImageField
				name="picture"
				label={picture ? m.competitions_picture_new() : m.competitions_picture()}
				current={picture}
				accept="image/jpeg,image/png"
				hint={picture ? m.competitions_picture_hint_edit() : m.competitions_picture_hint()}
				square
			/>
		</Card>
	</div>
</EntityForm>
