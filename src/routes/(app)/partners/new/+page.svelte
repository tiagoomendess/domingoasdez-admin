<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PartnerForm, { type PartnerValues } from '../PartnerForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	/** Same defaults as the legacy "create partner" form. */
	const defaults: PartnerValues = { name: '', url: '', priority: 1, visible: true };
</script>

<PageHeader
	title={m.partners_new()}
	back={resolve('/(app)/partners')}
	backLabel={m.partners_title()}
/>

<PartnerForm
	partner={defaults}
	picture={null}
	{form}
	cancelHref={resolve('/(app)/partners')}
	submitLabel={m.form_create()}
/>
