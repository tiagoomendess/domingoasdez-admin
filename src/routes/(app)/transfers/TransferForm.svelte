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

	let {
		player,
		team,
		date,
		visible,
		lockedPlayerId = null,
		onplayerchange,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		player: Option | null;
		team: Option | null;
		/** `YYYY-MM-DD`. */
		date: string;
		visible: boolean;
		/** Edit: the transfer stays with its player (fix a wrong player by deleting it). */
		lockedPlayerId?: number | null;
		/** New: show the picked player's history. */
		onplayerchange?: (option: Option | null) => void;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<Card size="xl" class="space-y-5 p-6">
		{#if lockedPlayerId}
			<input type="hidden" name="player_id" value={lockedPlayerId} />
			<div>
				<p class="mb-1 text-sm font-medium text-gray-900 dark:text-white">{m.transfers_player()}</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">{player?.label}</p>
			</div>
		{:else}
			<FormField name="player_id" label={m.transfers_player()} required>
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="player_id"
						endpoint={resolve('/api/options/players')}
						value={player}
						label={m.transfers_player()}
						placeholder={m.select_search_players()}
						required
						invalid={field.invalid}
						describedBy={field.describedBy}
						disabled={readonly}
						onchange={onplayerchange}
					/>
				{/snippet}
			</FormField>
		{/if}
		<FormField name="team_id" label={m.transfers_to()} hint={m.transfers_to_hint()}>
			{#snippet children(field)}
				<SearchSelect
					id={field.id}
					name="team_id"
					endpoint={resolve('/api/options/teams')}
					value={team}
					label={m.transfers_to()}
					placeholder={m.select_search_teams()}
					invalid={field.invalid}
					describedBy={field.describedBy}
					disabled={readonly}
				/>
			{/snippet}
		</FormField>
		<TextField
			name="date"
			type="date"
			label={m.transfers_date()}
			hint={m.transfers_date_hint()}
			value={date}
			required
		/>
		<ToggleField
			name="visible"
			label={m.common_visible()}
			hint={m.transfers_visible_hint()}
			checked={visible}
		/>
	</Card>
</EntityForm>
