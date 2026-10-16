<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import GoalForm from '../GoalForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader title={m.goals_new()} back={resolve('/(app)/goals')} backLabel={m.nav_goals()} />

<GoalForm
	goal={{ side: data.side, minute: null, penalty: false, ownGoal: false, visible: true }}
	game={data.game}
	player={null}
	{form}
	cancelHref={resolve('/(app)/goals')}
	submitLabel={m.form_create()}
/>
