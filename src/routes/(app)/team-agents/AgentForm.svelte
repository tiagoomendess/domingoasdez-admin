<script lang="ts">
	import { Card, Heading } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { agentTypeOptions } from '#lib/agent-types.ts';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import ImageField from '#lib/components/form/ImageField.svelte';
	import SelectField from '#lib/components/form/SelectField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	export type AgentValues = {
		name: string;
		agentType: string;
		/** `YYYY-MM-DD` or empty. */
		birthDate: string;
		externalId: string | null;
		email: string | null;
		phone: string | null;
	};

	let {
		agent,
		team,
		player,
		picture,
		creating = false,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		agent: AgentValues;
		/** Current team and player options (from the page `load`). */
		team: Option | null;
		player: Option | null;
		/** Display URL of the stored picture, if any. */
		picture: string | null;
		creating?: boolean;
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
						value={agent.name}
						required
						maxlength={155}
						autocomplete="off"
						class="md:col-span-2"
					/>
					<SelectField
						name="agent_type"
						label={m.team_agents_type()}
						value={agent.agentType}
						options={agentTypeOptions()}
						required
					/>
					<TextField
						name="birth_date"
						type="date"
						label={m.players_birth_date()}
						value={agent.birthDate}
					/>
					<FormField
						name="team_id"
						label={m.team_agents_current_team()}
						hint={creating ? m.team_agents_team_hint_create() : m.team_agents_team_hint()}
						class="md:col-span-2"
					>
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="team_id"
								endpoint={resolve('/api/options/teams')}
								value={team}
								label={m.team_agents_current_team()}
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
				<Heading tag="h2" class="mb-5 text-lg font-medium">{m.team_agents_section_other()}</Heading>
				<div class="grid gap-5 md:grid-cols-2">
					<FormField
						name="player_id"
						label={m.team_agents_player()}
						hint={m.team_agents_player_hint()}
						class="md:col-span-2"
					>
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="player_id"
								endpoint={resolve('/api/options/players')}
								value={player}
								label={m.team_agents_player()}
								placeholder={m.select_search_players()}
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
					<TextField
						name="phone"
						type="tel"
						label={m.players_phone()}
						value={agent.phone}
						maxlength={14}
						autocomplete="off"
					/>
					<TextField
						name="email"
						type="email"
						label={m.players_email()}
						value={agent.email}
						maxlength={100}
						autocomplete="off"
					/>
					<TextField
						name="external_id"
						label={m.team_agents_external_id()}
						hint={m.team_agents_external_id_hint()}
						value={agent.externalId}
						maxlength={155}
						autocomplete="off"
						class="md:col-span-2"
					/>
				</div>
			</Card>
		</div>

		<Card size="xl" class="space-y-5 self-start p-6">
			<Heading tag="h2" class="mb-1 text-lg font-medium">{m.players_picture()}</Heading>
			<ImageField
				name="picture"
				label={picture ? m.players_picture_new() : m.team_agents_picture_file()}
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
	</div>
</EntityForm>
