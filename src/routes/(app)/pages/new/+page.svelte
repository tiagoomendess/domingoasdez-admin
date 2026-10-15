<script lang="ts">
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PageForm, { type PageValues } from '../PageForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Same defaults as the legacy "create page" form. */
	const defaults: PageValues = { title: '', name: '', body: '', visible: true };
</script>

<PageHeader title={m.pages_new()} back={resolve('/(app)/pages')} backLabel={m.pages_title()} />

<PageForm
	page={defaults}
	picture={null}
	canUpload={can(data.user.permissions, 'media')}
	{form}
	cancelHref={resolve('/(app)/pages')}
	submitLabel={m.form_create()}
/>
