<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import GameForm from '../GameForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader title={m.games_new()} back={resolve('/(app)/games')} backLabel={m.nav_games()} />

<GameForm
	game={{
		round: null,
		date: '',
		goalsHome: null,
		goalsAway: null,
		penaltiesHome: null,
		penaltiesAway: null,
		finished: false,
		postponed: false,
		visible: true,
		scoreboardUpdates: true
	}}
	home={null}
	away={null}
	group={data.group}
	playground={null}
	referees={[]}
	refereeTypes={data.refereeTypes}
	creating
	{form}
	cancelHref={resolve('/(app)/games')}
	submitLabel={m.form_create()}
/>
