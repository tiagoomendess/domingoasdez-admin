<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import AgentForm, { type AgentValues } from '../AgentForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const defaults: AgentValues = {
		name: '',
		agentType: 'manager',
		birthDate: '',
		externalId: null,
		email: null,
		phone: null
	};
</script>

<PageHeader
	title={m.team_agents_new()}
	back={resolve('/(app)/team-agents')}
	backLabel={m.nav_team_agents()}
/>

<AgentForm
	agent={defaults}
	team={null}
	player={null}
	picture={null}
	creating
	{form}
	cancelHref={resolve('/(app)/team-agents')}
	submitLabel={m.form_create()}
/>
