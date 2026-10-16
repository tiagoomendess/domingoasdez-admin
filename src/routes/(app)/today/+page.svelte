<script lang="ts">
	import { Button, ButtonGroup, Heading } from 'flowbite-svelte';
	import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/state';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { can } from '#lib/auth/permissions.ts';
	import { listHref } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import ScoreCard from './ScoreCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const canBan = $derived(can(data.user.permissions, 'score-report-bans.create'));
	const canSeeUsers = $derived(can(data.user.permissions, 'users'));
	const isToday = $derived(data.day === data.today);
	const dayLabel = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC'
		}).format(new Date(`${data.day}T12:00:00Z`))
	);
	const dayHref = (day: string) => listHref(page.url, { day: day === data.today ? null : day });

	/** The failed save's game, to show its message on that card. */
	const failedGame = $derived(
		form && 'values' in form ? Number((form.values as Record<string, string>).game_id) : null
	);
	const scoreAction = $derived(isToday ? '?/score' : `?day=${data.day}&/score`);
	const savedGame = $derived(form && 'saved' in form ? form.saved : null);
	const gameCount = $derived(data.sections.reduce((total, s) => total + s.games.length, 0));
</script>

<PageHeader title={isToday ? m.today_title() : m.today_title_day({ day: dayLabel })} />

<div class="-mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
	<p class="text-sm text-gray-500 dark:text-gray-400">
		<span class="inline-block first-letter:uppercase">{dayLabel}</span> · {m.today_game_count({
			count: gameCount
		})}
	</p>
	{#if data.browse}
		<ButtonGroup>
			<Button href={dayHref(data.previous)} color="alternative" size="sm">
				<ChevronLeftOutline class="size-4" aria-hidden="true" />
				<span class="sr-only">{m.today_previous_day()}</span>
			</Button>
			<Button href={dayHref(data.today)} color="alternative" size="sm" disabled={isToday}>
				{m.today_today()}
			</Button>
			<Button href={dayHref(data.next)} color="alternative" size="sm">
				<ChevronRightOutline class="size-4" aria-hidden="true" />
				<span class="sr-only">{m.today_next_day()}</span>
			</Button>
		</ButtonGroup>
	{/if}
</div>

{#if data.sections.length === 0}
	<EmptyState message={data.browse ? m.today_empty() : m.today_empty_club()} />
{:else}
	<div class="space-y-8">
		{#each data.sections as section (section.id)}
			<section aria-labelledby="competition-{section.id}">
				<div class="mb-3 flex items-center gap-3">
					{#if section.picture}
						<img src={section.picture} alt="" class="size-8 object-contain" />
					{/if}
					<Heading tag="h2" id="competition-{section.id}" class="w-auto text-lg font-medium">
						{section.name}
					</Heading>
					<span class="text-sm text-gray-500 dark:text-gray-400">({section.games.length})</span>
				</div>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
					{#each section.games as game (game.id)}
						<!-- Re-created when the saved game comes back, so the stepper starts from it. -->
						{#key game.updatedAt}
							<ScoreCard
								{game}
								action={scoreAction}
								{canBan}
								{canSeeUsers}
								saved={savedGame === game.id}
								error={failedGame === game.id && form && 'message' in form ? form.message : null}
							/>
						{/key}
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}
