<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import RulesForm from '../RulesForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<PageHeader
	title={m.group_rules_new()}
	back={resolve('/(app)/group-rules')}
	backLabel={m.nav_group_rules()}
/>

<!-- Starts with the usual AFPB setup: points table with its tie-breaker. -->
<RulesForm
	rules={{
		name: '',
		type: 'points',
		promotes: 0,
		relegates: 0,
		tieBreaker: 'afpb',
		tieBreakerScript: null
	}}
	positions={[]}
	{form}
	cancelHref={resolve('/(app)/group-rules')}
	submitLabel={m.form_create()}
/>
