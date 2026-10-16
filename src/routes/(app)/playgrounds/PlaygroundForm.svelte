<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import LocationPicker from '#lib/components/form/LocationPicker.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	export type PlaygroundValues = {
		name: string;
		surface: string;
		width: number | null;
		height: number | null;
		capacity: number | null;
		priority: number;
		obs: string | null;
		visible: boolean;
		latitude: number | null;
		longitude: number | null;
	};

	let {
		playground,
		club,
		picture,
		surfaces,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		playground: PlaygroundValues;
		club: Option | null;
		picture: string | null;
		/** Surfaces already in use, suggested while typing. */
		surfaces: string[];
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel} multipart>
	<div class="grid items-start gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card size="xl" class="p-6">
				<div class="grid gap-5 md:grid-cols-2">
					<TextField
						name="name"
						label={m.common_name()}
						value={playground.name}
						required
						maxlength={155}
						autocomplete="off"
						class="md:col-span-2"
					/>
					<FormField name="club_id" label={m.playgrounds_club()} hint={m.playgrounds_club_hint()}>
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="club_id"
								endpoint={resolve('/api/options/clubs')}
								value={club}
								label={m.playgrounds_club()}
								placeholder={m.select_search_clubs()}
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
					<div>
						<TextField
							name="surface"
							label={m.playgrounds_surface()}
							value={playground.surface}
							required
							maxlength={155}
							autocomplete="off"
							list="surfaces"
						/>
						<datalist id="surfaces">
							{#each surfaces as surface (surface)}
								<option value={surface}></option>
							{/each}
						</datalist>
					</div>
				</div>
				<div class="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
					<TextField
						name="width"
						type="number"
						label={m.playgrounds_width()}
						value={playground.width}
						min={2}
						max={200}
					/>
					<TextField
						name="height"
						type="number"
						label={m.playgrounds_height()}
						value={playground.height}
						min={5}
						max={200}
					/>
					<TextField
						name="capacity"
						type="number"
						label={m.playgrounds_capacity()}
						value={playground.capacity}
						min={0}
						max={200000}
					/>
					<TextField
						name="priority"
						type="number"
						label={m.competitions_priority()}
						hint={m.playgrounds_priority_hint()}
						value={playground.priority}
						min={0}
						max={100}
					/>
				</div>
				<div class="mt-5">
					<TextareaField
						name="obs"
						label={m.players_obs()}
						value={playground.obs}
						maxlength={1000}
					/>
				</div>
			</Card>

			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.playgrounds_location()}</Heading>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{m.playgrounds_location_hint()}</p>
				<LocationPicker
					latitude={playground.latitude}
					longitude={playground.longitude}
					{readonly}
				/>
			</Card>
		</div>

		<div class="space-y-6">
			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-5 text-lg font-medium">{m.players_picture()}</Heading>
				<ImageField
					name="picture"
					label={picture ? m.competitions_picture_new() : m.playgrounds_picture()}
					current={picture}
					accept="image/jpeg,image/png"
					hint={m.playgrounds_picture_hint()}
				/>
			</Card>
			<Card size="xl" class="p-6">
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.playgrounds_visible_hint()}
					checked={playground.visible}
				/>
			</Card>
		</div>
	</div>
</EntityForm>
