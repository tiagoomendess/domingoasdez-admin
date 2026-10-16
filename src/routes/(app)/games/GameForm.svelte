<script lang="ts">
	import { Button, Card, Heading, Helper, Label, Select } from 'flowbite-svelte';
	import { PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import { untrack } from 'svelte';
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
	import { refereeTypeLabel } from '#lib/referee-types.ts';

	export type GameValues = {
		round: number | null;
		/** `datetime-local` value in the admin's timezone. */
		date: string;
		goalsHome: number | null;
		goalsAway: number | null;
		penaltiesHome: number | null;
		penaltiesAway: number | null;
		finished: boolean;
		postponed: boolean;
		visible: boolean;
		scoreboardUpdates: boolean;
	};

	const MAX_REFEREES = 8;

	let {
		game,
		home,
		away,
		group,
		playground,
		referees,
		refereeTypes,
		creating = false,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		game: GameValues;
		home: Option | null;
		away: Option | null;
		group: Option | null;
		playground: Option | null;
		referees: { referee: Option | null; typeId: number }[];
		refereeTypes: { id: number; name: string }[];
		creating?: boolean;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();

	const failure = $derived(isFormFailure(form) ? form : null);
	const errorsOf = (name: string) => failure?.errors[name] ?? [];

	let nextKey = 0;
	// Rows are edited here; each posts `referee_N` / `type_N` (renumbered on every render).
	let rows = $state(
		untrack(() =>
			referees.map((row) => ({ key: nextKey++, referee: row.referee, typeId: String(row.typeId) }))
		)
	);

	function addReferee() {
		// The first referee is usually the main one, the next ones assistants.
		const typeId = rows.length === 0 ? refereeTypes[0]?.id : refereeTypes[1]?.id;
		rows.push({ key: nextKey++, referee: null, typeId: String(typeId ?? '') });
	}
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<div class="grid items-start gap-6 xl:grid-cols-3">
		<div class="space-y-6 xl:col-span-2">
			<Card size="xl" class="p-6">
				<div class="grid gap-5 md:grid-cols-[1fr_auto_1fr] md:items-start">
					<FormField name="home_team_id" label={m.games_home()} required>
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="home_team_id"
								endpoint={resolve('/api/options/teams')}
								value={home}
								label={m.games_home()}
								placeholder={m.select_search_teams()}
								required
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
					<span class="hidden pt-9 text-sm font-semibold text-gray-400 md:block">vs</span>
					<FormField name="away_team_id" label={m.games_away()} required>
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="away_team_id"
								endpoint={resolve('/api/options/teams')}
								value={away}
								label={m.games_away()}
								placeholder={m.select_search_teams()}
								required
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
				</div>

				<div class="mt-5 grid gap-5 md:grid-cols-2">
					<FormField name="game_group_id" label={m.games_group()} required class="md:col-span-2">
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="game_group_id"
								endpoint={resolve('/api/options/game-groups')}
								value={group}
								label={m.games_group()}
								placeholder={m.select_search_groups()}
								required
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
					<TextField
						name="round"
						type="number"
						label={m.games_round()}
						value={game.round}
						required
						min={0}
						max={9999}
					/>
					<TextField
						name="date"
						type="datetime-local"
						label={m.games_date()}
						hint={m.games_date_hint()}
						value={game.date}
						required
					/>
					<FormField name="playground_id" label={m.games_playground()} class="md:col-span-2">
						{#snippet children(field)}
							<SearchSelect
								id={field.id}
								name="playground_id"
								endpoint={resolve('/api/options/playgrounds')}
								value={playground}
								label={m.games_playground()}
								placeholder={m.select_search_playgrounds()}
								invalid={field.invalid}
								describedBy={field.describedBy}
								disabled={readonly}
							/>
						{/snippet}
					</FormField>
				</div>
			</Card>

			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.games_result()}</Heading>
				<p class="mb-5 text-sm text-gray-500 dark:text-gray-400">{m.games_result_hint()}</p>
				<div class="grid grid-cols-2 gap-5 md:grid-cols-4">
					<TextField
						name="goals_home"
						type="number"
						label={m.games_goals_home()}
						value={game.goalsHome}
						min={0}
						max={99}
					/>
					<TextField
						name="goals_away"
						type="number"
						label={m.games_goals_away()}
						value={game.goalsAway}
						min={0}
						max={99}
					/>
					<TextField
						name="penalties_home"
						type="number"
						label={m.games_penalties_home()}
						value={game.penaltiesHome}
						min={0}
						max={99}
					/>
					<TextField
						name="penalties_away"
						type="number"
						label={m.games_penalties_away()}
						value={game.penaltiesAway}
						min={0}
						max={99}
					/>
				</div>
				<div class="mt-5 grid gap-4 md:grid-cols-2">
					<ToggleField
						name="finished"
						label={m.games_finished()}
						hint={m.games_finished_hint()}
						checked={game.finished}
					/>
					<ToggleField
						name="postponed"
						label={m.games_postponed()}
						hint={m.games_postponed_hint()}
						checked={game.postponed}
					/>
				</div>
			</Card>
		</div>

		<div class="space-y-6">
			<Card size="xl" class="p-6">
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.games_referees()}</Heading>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{m.games_referees_hint()}</p>
				{#each errorsOf('referees') as message (message)}
					<Helper color="red" class="mb-3">{message}</Helper>
				{/each}
				{#if rows.length === 0}
					<p class="mb-3 text-sm text-gray-600 dark:text-gray-400">{m.games_no_referees()}</p>
				{/if}
				<ul class="space-y-4">
					{#each rows as row, index (row.key)}
						<li class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
							<div>
								<Label for={`referee-${index}`} class="mb-1 text-xs">{m.games_referee()}</Label>
								<SearchSelect
									id={`referee-${index}`}
									name={`referee_${index}`}
									endpoint={resolve('/api/options/referees')}
									value={row.referee}
									label={m.games_referee()}
									placeholder={m.select_search_referees()}
									invalid={errorsOf(`referee_${index}`).length > 0}
									disabled={readonly}
									onchange={(option) => (row.referee = option)}
								/>
								{#each errorsOf(`referee_${index}`) as message (message)}
									<Helper color="red" class="mt-1">{message}</Helper>
								{/each}
							</div>
							<div class="flex items-end gap-2">
								<div class="flex-1">
									<Label for={`type-${index}`} class="mb-1 text-xs">{m.games_referee_role()}</Label>
									<Select
										id={`type-${index}`}
										name={`type_${index}`}
										bind:value={row.typeId}
										placeholder=""
										disabled={readonly}
									>
										{#each refereeTypes as type (type.id)}
											<option value={String(type.id)}>{refereeTypeLabel(type.name)}</option>
										{/each}
									</Select>
								</div>
								{#if !readonly}
									<Button
										type="button"
										color="alternative"
										class="h-10 px-3"
										aria-label={m.games_remove_referee()}
										onclick={() => rows.splice(index, 1)}
									>
										<TrashBinOutline class="size-4" aria-hidden="true" />
									</Button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
				{#if !readonly && rows.length < MAX_REFEREES}
					<Button
						type="button"
						color="alternative"
						size="sm"
						class="mt-3 gap-2"
						onclick={addReferee}
					>
						<PlusOutline class="size-4" aria-hidden="true" />
						{m.games_add_referee()}
					</Button>
				{/if}
			</Card>

			<Card size="xl" class="space-y-4 p-6">
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.games_visible_hint()}
					checked={game.visible}
				/>
				{#if !creating}
					<ToggleField
						name="scoreboard_updates"
						label={m.games_scoreboard_updates()}
						hint={m.games_scoreboard_updates_hint()}
						checked={game.scoreboardUpdates}
					/>
				{/if}
			</Card>
		</div>
	</div>
</EntityForm>
