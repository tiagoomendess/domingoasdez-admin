<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import SelectField from '#lib/components/form/SelectField.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { positionOptions } from '#lib/player-positions.ts';

	export type PlayerValues = {
		name: string;
		nickname: string | null;
		associationId: string | null;
		position: string;
		/** `YYYY-MM-DD` or empty. */
		birthDate: string;
		phone: string | null;
		email: string | null;
		facebookProfile: string | null;
		obs: string | null;
		visible: boolean;
	};

	let {
		player,
		team,
		picture,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		player: PlayerValues;
		/** Current team option (from the page `load`). */
		team: Option | null;
		/** Display URL of the stored picture, if any. */
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
		<div class="space-y-6 xl:col-span-2">
			<Card size="xl" class="p-6">
				<div class="grid gap-5 md:grid-cols-2">
					<TextField
						name="name"
						label={m.common_name()}
						hint={m.players_name_hint()}
						value={player.name}
						required
						maxlength={155}
						autocomplete="off"
						class="md:col-span-2"
					/>
					<TextField
						name="nickname"
						label={m.players_nickname()}
						value={player.nickname}
						maxlength={155}
						autocomplete="off"
					/>
					<TextField
						name="association_id"
						label={m.players_association_id()}
						value={player.associationId}
						maxlength={155}
						autocomplete="off"
					/>
					<SelectField
						name="position"
						label={m.players_position()}
						value={player.position}
						options={positionOptions()}
						required
					/>
					<TextField
						name="birth_date"
						type="date"
						label={m.players_birth_date()}
						value={player.birthDate}
					/>
					<FormField
						name="team_id"
						label={m.players_team()}
						hint={m.players_team_hint()}
						class="md:col-span-2"
					>
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="team_id"
								endpoint={resolve('/api/options/teams')}
								value={team}
								label={m.players_team()}
								placeholder={m.select_search_teams()}
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
				</div>
			</Card>

			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-5 text-lg font-medium">{m.players_section_contacts()}</Heading>
				<div class="grid gap-5 md:grid-cols-2">
					<TextField
						name="phone"
						type="tel"
						label={m.players_phone()}
						value={player.phone}
						maxlength={14}
						autocomplete="off"
					/>
					<TextField
						name="email"
						type="email"
						label={m.players_email()}
						value={player.email}
						maxlength={100}
						autocomplete="off"
					/>
					<TextField
						name="facebook_profile"
						type="url"
						label={m.players_facebook_profile()}
						value={player.facebookProfile}
						maxlength={280}
						autocomplete="off"
						class="md:col-span-2"
					/>
					<TextareaField
						name="obs"
						label={m.players_obs()}
						hint={m.players_obs_hint()}
						value={player.obs}
						maxlength={3000}
						class="md:col-span-2"
					/>
				</div>
			</Card>
		</div>

		<div class="space-y-6">
			<Card size="xl" class="space-y-5 p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.players_picture()}</Heading>
				<ImageField
					name="picture"
					label={picture ? m.players_picture_new() : m.players_picture_file()}
					current={picture}
					accept="image/jpeg,image/png"
					hint={m.players_picture_hint()}
					square
				/>
				<TextField
					name="picture_url"
					type="url"
					label={m.players_picture_url()}
					hint={m.players_picture_url_hint()}
					maxlength={280}
					autocomplete="off"
				/>
			</Card>

			<Card size="xl" class="p-6">
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.players_visible_hint()}
					checked={player.visible}
				/>
			</Card>
		</div>
	</div>
</EntityForm>
