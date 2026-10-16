<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<PageHeader
	title={m.permissions_new()}
	back={resolve('/(app)/permissions')}
	backLabel={m.nav_permissions()}
/>

<EntityForm {form} cancelHref={resolve('/(app)/permissions')} submitLabel={m.form_create()}>
	<Card size="xl" class="max-w-2xl p-6">
		<TextField
			name="name"
			label={m.common_name()}
			hint={m.permissions_name_hint()}
			required
			maxlength={100}
			autocomplete="off"
		/>
	</Card>
</EntityForm>
