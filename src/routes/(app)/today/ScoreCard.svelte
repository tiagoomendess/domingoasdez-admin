<script lang="ts">
	import { Badge, Button, Card, Toggle } from 'flowbite-svelte';
	import { CheckOutline, MinusOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { DEFAULT_TIMEZONE, isTimeZone } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import ReportsModal from './ReportsModal.svelte';

	type Side = { club: string; team: string; emblem: string };

	let {
		game,
		action = '?/score',
		canBan = false,
		canSeeUsers = false,
		saved = false,
		error = null
	}: {
		game: {
			id: number;
			date: Date;
			round: number;
			goalsHome: number;
			goalsAway: number;
			finished: boolean;
			postponed: boolean;
			home: Side;
			away: Side;
			group: string;
			reported: { score: string; count: number }[];
			canEdit: boolean;
		};
		/** Keeps the page's `?day=` (a bare `?/score` would go back to today). */
		action?: string;
		/** Passed to the reports modal. */
		canBan?: boolean;
		canSeeUsers?: boolean;
		/** This game was the last one saved. */
		saved?: boolean;
		/** The action's message when saving this game failed. */
		error?: string | null;
	} = $props();

	// The parent re-creates the card ({#key}) when the saved game comes back.
	// svelte-ignore state_referenced_locally
	let home = $state(game.goalsHome);
	// svelte-ignore state_referenced_locally
	let away = $state(game.goalsAway);
	// svelte-ignore state_referenced_locally
	let finished = $state(game.finished);
	let saving = $state(false);
	let showReports = $state(false);
	let reportsModal = $state<ReturnType<typeof ReportsModal>>();

	const dirty = $derived(
		home !== game.goalsHome || away !== game.goalsAway || finished !== game.finished
	);

	const time = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			timeZone: isTimeZone(page.data.timezone) ? page.data.timezone : DEFAULT_TIMEZONE,
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(game.date))
	);

	function apply(score: string) {
		const [h, a] = score.split('-').map(Number);
		home = h;
		away = a;
	}
</script>

{#snippet side(team: Side, value: number, set: (next: number) => void, label: string)}
	<div class="flex items-center gap-3">
		<img src={team.emblem} alt="" class="size-10 shrink-0 object-contain" loading="lazy" />
		<div class="min-w-0 flex-1">
			<p class="truncate font-medium text-gray-900 dark:text-white">{team.club}</p>
			<p class="truncate text-xs text-gray-500 dark:text-gray-400">{team.team}</p>
		</div>
		<div class="flex items-center gap-2">
			{#if game.canEdit}
				<Button
					type="button"
					color="alternative"
					size="sm"
					class="size-10 p-0"
					disabled={value === 0 || saving}
					onclick={() => set(value - 1)}
					aria-label={m.today_minus({ team: label })}
				>
					<MinusOutline class="size-4" aria-hidden="true" />
				</Button>
			{/if}
			<span
				class="w-8 text-center text-2xl font-semibold text-gray-900 tabular-nums dark:text-white"
				aria-live="polite">{value}</span
			>
			{#if game.canEdit}
				<Button
					type="button"
					color="alternative"
					size="sm"
					class="size-10 p-0"
					disabled={value >= 99 || saving}
					onclick={() => set(value + 1)}
					aria-label={m.today_plus({ team: label })}
				>
					<PlusOutline class="size-4" aria-hidden="true" />
				</Button>
			{/if}
		</div>
	</div>
{/snippet}

<!-- min-w-0: the nowrap (truncated) texts would otherwise widen the grid column past the screen. -->
<Card size="xl" class={['min-w-0 p-4', dirty && 'ring-2 ring-primary-500']}>
	<form
		method="POST"
		{action}
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update({ reset: false });
				saving = false;
			};
		}}
	>
		<input type="hidden" name="game_id" value={game.id} />
		<input type="hidden" name="goals_home" value={home} />
		<input type="hidden" name="goals_away" value={away} />

		<div class="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
			<span class="font-semibold text-gray-900 tabular-nums dark:text-white">{time}</span>
			<span class="min-w-0 flex-1 truncate"
				>{game.group} · {m.today_round({ round: game.round })}</span
			>
			{#if game.postponed}<Badge color="yellow">{m.today_postponed()}</Badge>{/if}
			{#if game.finished}<Badge color="green">{m.today_finished()}</Badge>{/if}
		</div>

		<div class="space-y-3">
			{@render side(game.home, home, (next) => (home = next), game.home.club)}
			{@render side(game.away, away, (next) => (away = next), game.away.club)}
		</div>

		{#if game.reported.length}
			<div class="mt-3 flex flex-wrap items-center gap-1.5">
				<span class="text-xs text-gray-500 dark:text-gray-400">{m.today_reported()}</span>
				{#each game.reported as report (report.score)}
					<button
						type="button"
						class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 tabular-nums hover:bg-primary-100 hover:text-primary-800 disabled:pointer-events-none dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-900 dark:hover:text-primary-200"
						disabled={!game.canEdit || saving}
						title={m.today_use_reported()}
						onclick={() => apply(report.score)}
					>
						{report.score} <span class="text-gray-500 dark:text-gray-400">({report.count})</span>
					</button>
				{/each}
				<button
					type="button"
					class="ms-auto text-xs font-medium text-primary-700 hover:underline dark:text-primary-400"
					onclick={() => reportsModal?.show()}
				>
					{m.today_details()}
				</button>
			</div>
		{/if}

		{#if game.canEdit}
			<div
				class="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-700"
			>
				<Toggle name="finished" bind:checked={finished} disabled={saving}>
					{m.today_finished_toggle()}
				</Toggle>
				{#if saved && !dirty}
					<span class="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
						<CheckOutline class="size-4" aria-hidden="true" />
						{m.today_saved()}
					</span>
				{:else}
					<Button type="submit" size="sm" disabled={!dirty} loading={saving}>
						{m.form_save()}
					</Button>
				{/if}
			</div>
		{/if}
		{#if error}
			<p class="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>
		{/if}
	</form>
</Card>

<ReportsModal
	bind:this={reportsModal}
	gameId={game.id}
	title={`${game.home.club} vs ${game.away.club}`}
	bind:open={showReports}
	{canBan}
	{canSeeUsers}
/>
