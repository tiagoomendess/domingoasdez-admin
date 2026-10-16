<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	export type SeasonValues = {
		startYear: number | null;
		endYear: number | null;
		name: string | null;
		obs: string | null;
		visible: boolean;
	};

	let {
		season,
		competition,
		picture,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		season: SeasonValues;
		competition: Option | null;
		/** Display URL of the season's own picture, if any. */
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
				<FormField
					name="competition_id"
					label={m.seasons_competition()}
					required
					class="md:col-span-2"
				>
					{#snippet children(field)}
						<SearchSelect
							id={field.id}
							name="competition_id"
							endpoint={resolve('/api/options/competitions')}
							value={competition}
							label={m.seasons_competition()}
							placeholder={m.select_search_competitions()}
							required
							invalid={field.invalid}
							describedBy={field.describedBy}
							disabled={readonly}
						/>
					{/snippet}
				</FormField>
				<TextField
					name="start_year"
					type="number"
					label={m.seasons_start_year()}
					value={season.startYear}
					required
					min={1970}
					max={20000}
				/>
				<TextField
					name="end_year"
					type="number"
					label={m.seasons_end_year()}
					hint={m.seasons_years_hint()}
					value={season.endYear}
					required
					min={1970}
					max={20000}
				/>
				<TextField
					name="name"
					label={m.seasons_display_name()}
					hint={m.seasons_display_name_hint()}
					value={season.name}
					maxlength={155}
					autocomplete="off"
					class="md:col-span-2"
				/>
				<TextareaField
					name="obs"
					label={m.players_obs()}
					value={season.obs}
					rows={4}
					class="md:col-span-2"
				/>
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.seasons_visible_hint()}
					checked={season.visible}
				/>
			</div>
		</Card>
		<Card size="xl" class="space-y-5 p-6">
			<Heading tag="h2" class="text-lg font-medium">{m.seasons_picture()}</Heading>
			<ImageField
				name="picture"
				label={picture ? m.competitions_picture_new() : m.seasons_picture_file()}
				current={picture}
				accept="image/jpeg,image/png"
				hint={m.seasons_picture_hint()}
				square
			/>
			{#if picture}
				<ToggleField
					name="clear_picture"
					label={m.seasons_clear_picture()}
					hint={m.seasons_clear_picture_hint()}
					checked={false}
				/>
			{/if}
		</Card>
	</div>
</EntityForm>
