<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ClubForm, { type ClubValues } from '../ClubForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	/** Same defaults as the legacy "create club" form. */
	const defaults: ClubValues = {
		name: '',
		foundingDate: null,
		website: null,
		contactEmail: null,
		priority: 1,
		visible: true,
		notificationsEnabled: true,
		birthdayPostEnabled: true
	};
</script>

<PageHeader title={m.clubs_new()} back={resolve('/(app)/clubs')} backLabel={m.clubs_title()} />

<ClubForm
	club={defaults}
	emblem={null}
	adminUser={null}
	{form}
	cancelHref={resolve('/(app)/clubs')}
	submitLabel={m.form_create()}
/>
