<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { describeVariable } from '../descriptions';
	import ValueField from '../ValueField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const description = $derived(data.name ? describeVariable(data.name) : null);
</script>

<PageHeader
	title={m.settings_new()}
	back={resolve('/(app)/settings')}
	backLabel={m.nav_settings()}
/>

<EntityForm {form} cancelHref={resolve('/(app)/settings')} submitLabel={m.form_create()}>
	<Card size="xl" class="max-w-3xl space-y-5 p-6">
		<TextField
			name="name"
			label={m.settings_name()}
			value={data.name}
			hint={description ?? m.settings_name_hint()}
			required
			maxlength={64}
			autocomplete="off"
		/>
		<ValueField kind={data.kind} value={null} creating />
	</Card>
</EntityForm>
