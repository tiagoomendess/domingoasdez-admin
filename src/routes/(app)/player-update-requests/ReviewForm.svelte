<script lang="ts">
	import { Alert, Button, Card, Heading, Helper, Label, Radio, Textarea } from 'flowbite-svelte';
	import {
		ArrowRightOutline,
		CheckOutline,
		CloseOutline,
		ExclamationCircleOutline
	} from 'flowbite-svelte-icons';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import { isFormFailure } from '#lib/forms.ts';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';
	import FieldValue from './FieldValue.svelte';

	type Row = { field: string; current: string | null; requested: string; changed: boolean };
	type Club =
		| { kind: 'none' }
		| {
				kind: 'club';
				club: { id: number; name: string; emblem: string };
				teams: { id: number; name: string }[];
				suggestedTeamId: number | null;
		  }
		| { kind: 'unknown'; clubName: string };

	let {
		rows,
		club,
		squad,
		currentTeam,
		creating,
		readonly,
		nextId,
		form
	}: {
		rows: Row[];
		club: Club | null;
		/** The federation's squad name sent with the club ("Séniores Feminino"). */
		squad: string | null;
		currentTeam: Option | null;
		/** A new player: there is no current value to compare with. */
		creating: boolean;
		/** Already reviewed, or no `.edit` permission. */
		readonly: boolean;
		nextId: number | null;
		form: unknown;
	} = $props();

	const failure = $derived(isFormFailure(form) ? form : null);
	const errorsOf = (name: string) => failure?.errors[name] ?? [];

	const LABELS: Record<string, () => string> = {
		name: m.common_name,
		nickname: m.players_nickname,
		picture: m.players_picture,
		association_id: m.players_association_id,
		phone: m.players_phone,
		email: m.players_email,
		facebook_profile: m.players_facebook_profile,
		birth_date: m.players_birth_date,
		position: m.players_position,
		club: m.players_team,
		obs: m.players_obs
	};

	const changes = $derived(rows.filter((row) => row.changed));
	const unchanged = $derived(rows.filter((row) => !row.changed));
	/** A new player always gets a name. */
	const locked = (field: string) => creating && field === 'name';

	// Every change is applied unless the admin unticks it (the component restarts per request).
	const selected = new SvelteSet<string>(untrack(() => changes.map((row) => row.field)));
	let teamId = $state<number | null>(
		untrack(() => (club?.kind === 'club' ? club.suggestedTeamId : null))
	);
	let submitting = $state(false);

	const applyCount = $derived(changes.filter((row) => selected.has(row.field)).length);
	const allSelected = $derived(applyCount === changes.length);

	function toggleAll() {
		if (allSelected) {
			for (const row of changes) if (!locked(row.field)) selected.delete(row.field);
		} else {
			for (const row of changes) selected.add(row.field);
		}
	}

	function toggle(field: string, checked: boolean) {
		if (checked) selected.add(field);
		else selected.delete(field);
	}

	const approveLabel = $derived(
		creating
			? m.update_requests_approve_create()
			: applyCount === 0
				? m.update_requests_approve_none()
				: m.update_requests_approve({ count: applyCount })
	);
</script>

<form
	method="POST"
	action="?/approve"
	novalidate
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	{#if failure?.message}
		<Alert color="red" class="mb-6 flex items-center gap-2 dark:bg-gray-800 dark:text-red-400">
			<ExclamationCircleOutline class="size-5 shrink-0" aria-hidden="true" />
			<span>{failure.message}</span>
		</Alert>
	{/if}

	<Card size="xl" class="overflow-hidden p-0">
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700"
		>
			<div>
				<Heading tag="h2" class="text-lg font-medium">{m.update_requests_changes()}</Heading>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{#if changes.length === 0}
						{m.update_requests_no_changes()}
					{:else if readonly}
						{m.update_requests_changes_count({ count: changes.length })}
					{:else}
						{m.update_requests_changes_hint()}
					{/if}
				</p>
			</div>
			{#if !readonly && changes.length > 1}
				<Button color="alternative" size="xs" onclick={toggleAll}>
					{allSelected ? m.update_requests_select_none() : m.update_requests_select_all()}
				</Button>
			{/if}
		</div>

		{#if errorsOf('fields').length}
			<Helper color="red" class="px-6 pt-4" role="alert">{errorsOf('fields').join(' ')}</Helper>
		{/if}

		<!-- Compare: one row per field, current value on the left, requested on the right. -->
		<div
			class="hidden grid-cols-[3rem_10rem_1fr_1fr] gap-4 border-b border-gray-200 bg-gray-50 px-6 py-2 text-xs font-semibold text-gray-500 uppercase md:grid dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
		>
			<span class="sr-only">{m.update_requests_apply()}</span>
			<span>{m.update_requests_field()}</span>
			{#if !creating}<span>{m.update_requests_current()}</span>{/if}
			<span class={creating ? 'md:col-span-2' : undefined}>{m.update_requests_requested()}</span>
		</div>

		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#each changes as row (row.field)}
				{@const checked = selected.has(row.field)}
				<li
					class={[
						'grid grid-cols-[3rem_1fr] gap-x-4 gap-y-2 px-6 py-4 transition-colors md:grid-cols-[3rem_10rem_1fr_1fr]',
						checked ? 'bg-primary-50/60 dark:bg-primary-900/10' : 'opacity-70'
					]}
				>
					<div class="row-span-3 pt-0.5 md:row-span-1">
						{#if readonly}
							<span class="sr-only">{LABELS[row.field]()}</span>
						{:else}
							<!-- Native input: Flowbite's Checkbox resets `checked` from its `group` when given a value. -->
							<input
								type="checkbox"
								id={`apply-${row.field}`}
								name="fields"
								value={row.field}
								{checked}
								disabled={locked(row.field)}
								aria-label={m.update_requests_apply_field({ field: LABELS[row.field]() })}
								onchange={(event) => toggle(row.field, event.currentTarget.checked)}
								class="size-5 rounded-sm border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
							/>
							{#if locked(row.field)}
								<!-- Disabled checkboxes are not sent. -->
								<input type="hidden" name="fields" value={row.field} />
							{/if}
						{/if}
					</div>
					<label
						for={readonly ? undefined : `apply-${row.field}`}
						class="text-sm font-medium text-gray-900 dark:text-white"
					>
						{LABELS[row.field]()}
					</label>

					{#if !creating}
						<div class="col-start-2 text-sm md:col-start-auto">
							<span class="mb-1 block text-xs text-gray-500 md:hidden dark:text-gray-400"
								>{m.update_requests_current()}</span
							>
							{#if row.field === 'club'}
								{#if currentTeam}
									<span class="flex items-center gap-2">
										<img src={currentTeam.image} alt="" class="size-6 object-contain" />
										{currentTeam.label}
									</span>
								{:else}
									<span class="text-gray-400 italic">{m.players_no_team()}</span>
								{/if}
							{:else}
								<FieldValue field={row.field} value={row.current} />
							{/if}
						</div>
					{/if}

					<div class={['col-start-2 text-sm md:col-start-auto', creating && 'md:col-span-2']}>
						<span class="mb-1 block text-xs text-gray-500 md:hidden dark:text-gray-400"
							>{m.update_requests_requested()}</span
						>
						{#if row.field === 'club' && club}
							{@render clubChoice(club, checked)}
						{:else}
							<FieldValue field={row.field} value={row.requested} changed />
						{/if}
						{#each errorsOf(row.field) as message (message)}
							<Helper color="red" class="mt-1" role="alert">{message}</Helper>
						{/each}
					</div>
				</li>
			{/each}
		</ul>

		{#if unchanged.length}
			<details class="border-t border-gray-200 dark:border-gray-700">
				<summary
					class="cursor-pointer px-6 py-3 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				>
					{m.update_requests_unchanged({ count: unchanged.length })}
				</summary>
				<ul class="divide-y divide-gray-100 px-6 pb-3 dark:divide-gray-700">
					{#each unchanged as row (row.field)}
						<li class="grid grid-cols-[10rem_1fr] gap-4 py-2 text-sm">
							<span class="text-gray-500 dark:text-gray-400">{LABELS[row.field]()}</span>
							{#if row.field === 'club'}
								<span class="text-gray-700 dark:text-gray-300"
									>{currentTeam?.label ?? m.players_no_team()}</span
								>
							{:else}
								<FieldValue field={row.field} value={row.requested} />
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</Card>

	{#if !readonly}
		<div
			class="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-gray-700 dark:bg-gray-900/95"
		>
			<div class="flex flex-col gap-3 lg:flex-row lg:items-end">
				<div class="flex-1">
					<Label for="review_notes" class="mb-1 text-xs">{m.update_requests_notes()}</Label>
					<Textarea
						id="review_notes"
						name="review_notes"
						rows={1}
						maxlength={1000}
						value={failure?.values.review_notes ?? ''}
						placeholder={m.update_requests_notes_placeholder()}
						color={errorsOf('review_notes').length ? 'red' : 'default'}
						aria-invalid={errorsOf('review_notes').length > 0 || undefined}
						aria-describedby="review_notes-error"
						class="w-full"
					/>
					{#if errorsOf('review_notes').length}
						<Helper id="review_notes-error" color="red" class="mt-1">
							{m.update_requests_deny_reason()}
						</Helper>
					{/if}
				</div>
				<div class="flex flex-wrap justify-end gap-2">
					{#if nextId}
						<Button
							href={resolve('/(app)/player-update-requests/[id=id]', { id: nextId })}
							color="alternative"
							class="gap-2"
						>
							{m.update_requests_skip()}
							<ArrowRightOutline class="size-4" aria-hidden="true" />
						</Button>
					{/if}
					<Button
						type="submit"
						formaction="?/deny"
						color="red"
						outline
						class="gap-2"
						disabled={submitting}
					>
						<CloseOutline class="size-4" aria-hidden="true" />
						{m.update_requests_deny()}
					</Button>
					<Button type="submit" color="green" class="gap-2" loading={submitting}>
						{#if !submitting}<CheckOutline class="size-4" aria-hidden="true" />{/if}
						{approveLabel}
					</Button>
				</div>
			</div>
		</div>
	{/if}
</form>

{#snippet clubChoice(club: Club, checked: boolean)}
	{#if club.kind === 'none'}
		<span class="font-medium text-gray-900 dark:text-white">{m.update_requests_leaves_club()}</span>
	{:else if club.kind === 'club'}
		<span class="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
			<img src={club.club.emblem} alt="" class="size-6 object-contain" />
			{club.club.name}
		</span>
		{#if squad}
			<span class="text-xs text-gray-500 dark:text-gray-400">{squad}</span>
		{/if}
		{#if !readonly}
			<fieldset class="mt-2 space-y-1.5" disabled={!checked}>
				<legend class="mb-1 text-xs text-gray-500 dark:text-gray-400">
					{m.update_requests_pick_team()}
				</legend>
				{#each club.teams as team (team.id)}
					<Radio name="team_id" value={team.id} bind:group={teamId}>
						{team.name}
						{#if team.id === club.suggestedTeamId && club.teams.length > 1}
							<span class="ms-1 text-xs text-green-700 dark:text-green-400"
								>({m.update_requests_suggested()})</span
							>
						{/if}
					</Radio>
				{/each}
			</fieldset>
		{/if}
	{:else}
		<span class="font-medium text-gray-900 dark:text-white">{club.clubName}</span>
		{#if squad}
			<span class="text-xs text-gray-500 dark:text-gray-400">{squad}</span>
		{/if}
		<p class="mt-1 text-xs text-amber-700 dark:text-amber-400">
			{m.update_requests_club_unknown()}
		</p>
		{#if !readonly}
			<div class="mt-2">
				<SearchSelect
					name="team_id"
					endpoint={resolve('/api/options/teams')}
					label={m.players_team()}
					placeholder={m.select_search_teams()}
					disabled={!checked}
					invalid={errorsOf('team_id').length > 0}
				/>
			</div>
		{/if}
	{/if}
	{#each errorsOf('team_id') as message (message)}
		<Helper color="red" class="mt-1" role="alert">{message}</Helper>
	{/each}
{/snippet}
