<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	let {
		name,
		season,
		rules,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		name: string;
		season: Option | null;
		rules: Option | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<Card size="xl" class="max-w-3xl p-6">
		<div class="grid gap-5">
			<TextField
				name="name"
				label={m.common_name()}
				hint={m.game_groups_name_hint()}
				value={name}
				required
				maxlength={154}
				autocomplete="off"
			/>
			<FormField name="season_id" label={m.game_groups_season()} required>
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="season_id"
						endpoint={resolve('/api/options/seasons')}
						value={season}
						label={m.game_groups_season()}
						placeholder={m.select_search_seasons()}
						required
						invalid={field.invalid}
						describedBy={field.describedBy}
						disabled={readonly}
					/>
				{/snippet}
			</FormField>
			<FormField
				name="group_rules_id"
				label={m.game_groups_rules()}
				hint={m.game_groups_rules_hint()}
				required
			>
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="group_rules_id"
						endpoint={resolve('/api/options/group-rules')}
						value={rules}
						label={m.game_groups_rules()}
						placeholder={m.select_search_rules()}
						required
						invalid={field.invalid}
						describedBy={field.describedBy}
						disabled={readonly}
					/>
				{/snippet}
			</FormField>
		</div>
	</Card>
</EntityForm>
