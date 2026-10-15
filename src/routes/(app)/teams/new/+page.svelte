<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import TeamForm from '../TeamForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader title={m.teams_new()} back={resolve('/(app)/teams')} backLabel={m.teams_title()} />

<TeamForm
	team={{ name: '', contactEmail: null, visible: true }}
	club={data.club}
	{form}
	cancelHref={resolve('/(app)/teams')}
	submitLabel={m.form_create()}
/>
