<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	export type TeamValues = {
		name: string;
		contactEmail: string | null;
		visible: boolean;
	};

	let {
		team,
		club,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		team: TeamValues;
		/** Current club option (from the page `load`). */
		club: Option | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<Card size="xl" class="max-w-3xl p-6">
		<div class="grid gap-5 md:grid-cols-2">
			<TextField
				name="name"
				label={m.common_name()}
				hint={m.teams_name_hint()}
				value={team.name}
				required
				maxlength={155}
				autocomplete="off"
				class="md:col-span-2"
			/>
			<FormField name="club_id" label={m.teams_club()} required class="md:col-span-2">
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="club_id"
						endpoint={resolve('/api/options/clubs')}
						value={club}
						label={m.teams_club()}
						placeholder={m.select_search_clubs()}
						required
						invalid={field.invalid}
						describedBy={field.describedBy}
						disabled={readonly}
					/>
				{/snippet}
			</FormField>
			<TextField
				name="contact_email"
				type="email"
				label={m.common_contact_email()}
				value={team.contactEmail}
				maxlength={155}
				autocomplete="off"
				class="md:col-span-2"
			/>
			<ToggleField name="visible" label={m.common_visible()} checked={team.visible} />
		</div>
	</Card>
</EntityForm>
