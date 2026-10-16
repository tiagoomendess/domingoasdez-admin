<script lang="ts">
	import { Card, Radio } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import { isFormFailure } from '#lib/forms.ts';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	export type GoalValues = {
		side: 'home' | 'away';
		minute: number | null;
		penalty: boolean;
		ownGoal: boolean;
		visible: boolean;
	};

	let {
		goal,
		game,
		player,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		goal: GoalValues;
		game: Option | null;
		player: Option | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();

	// "Home vs Away": the side choice names the clubs once a game is picked.
	let picked = $state<Option | null | undefined>(undefined);
	const current = $derived(picked === undefined ? game : picked);
	const clubs = $derived(current?.label.split(' vs ') ?? []);
	const side = $derived(
		isFormFailure(form) ? (form.values.side === 'away' ? 'away' : 'home') : goal.side
	);
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<Card size="xl" class="max-w-3xl p-6">
		<div class="grid gap-5 md:grid-cols-2">
			<FormField name="game_id" label={m.goals_game()} required class="md:col-span-2">
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="game_id"
						endpoint={resolve('/api/options/games')}
						value={game}
						label={m.goals_game()}
						placeholder={m.select_search_games()}
						required
						invalid={field.invalid}
						describedBy={field.describedBy}
						disabled={readonly}
						onchange={(option) => (picked = option)}
					/>
				{/snippet}
			</FormField>
			<FormField
				name="side"
				label={m.goals_team()}
				hint={m.goals_team_hint()}
				required
				class="md:col-span-2"
			>
				{#snippet children(field)}
					<div
						id={field.id}
						role="radiogroup"
						aria-invalid={field.invalid || undefined}
						aria-describedby={field.describedBy}
						class="flex flex-wrap gap-6"
					>
						<Radio name="side" value="home" group={side} disabled={readonly}>
							{m.game_comments_home()}{clubs[0] ? ` · ${clubs[0]}` : ''}
						</Radio>
						<Radio name="side" value="away" group={side} disabled={readonly}>
							{m.game_comments_away()}{clubs[1] ? ` · ${clubs[1]}` : ''}
						</Radio>
					</div>
				{/snippet}
			</FormField>
			<FormField
				name="player_id"
				label={m.goals_player()}
				hint={m.goals_player_hint()}
				class="md:col-span-2"
			>
				{#snippet children(field)}
					<SearchSelect
						id={field.id}
						name="player_id"
						endpoint={resolve('/api/options/players')}
						value={player}
						label={m.goals_player()}
						placeholder={m.select_search_players()}
						invalid={field.invalid}
						describedBy={field.describedBy}
						disabled={readonly}
					/>
				{/snippet}
			</FormField>
			<TextField
				name="minute"
				type="number"
				label={m.goals_minute()}
				hint={m.goals_minute_hint()}
				value={goal.minute}
				min={1}
				max={140}
			/>
			<div class="space-y-4 md:col-span-2">
				<ToggleField name="penalty" label={m.goals_penalty()} checked={goal.penalty} />
				<ToggleField
					name="own_goal"
					label={m.goals_own_goal()}
					hint={m.goals_own_goal_hint()}
					checked={goal.ownGoal}
				/>
				<ToggleField name="visible" label={m.common_visible()} checked={goal.visible} />
			</div>
		</div>
	</Card>
</EntityForm>
