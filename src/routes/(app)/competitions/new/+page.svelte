<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import CompetitionForm from '../CompetitionForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<PageHeader
	title={m.competitions_new()}
	back={resolve('/(app)/competitions')}
	backLabel={m.nav_competitions()}
/>

<CompetitionForm
	competition={{ name: '', priority: 0, visible: true, socialMediaEnabled: true }}
	picture={null}
	{form}
	cancelHref={resolve('/(app)/competitions')}
	submitLabel={m.form_create()}
/>
