<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import SeasonForm from '../SeasonForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The current football season: from August it is "this year/next year".
	const now = new Date();
	const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
</script>

<PageHeader title={m.seasons_new()} back={resolve('/(app)/seasons')} backLabel={m.nav_seasons()} />

<SeasonForm
	season={{ startYear: start, endYear: start + 1, name: null, obs: null, visible: true }}
	competition={data.competition}
	picture={null}
	{form}
	cancelHref={resolve('/(app)/seasons')}
	submitLabel={m.form_create()}
/>
