<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PlaygroundForm from '../PlaygroundForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader
	title={m.playgrounds_new()}
	back={resolve('/(app)/playgrounds')}
	backLabel={m.nav_playgrounds()}
/>

<PlaygroundForm
	playground={{
		name: '',
		surface: '',
		width: null,
		height: null,
		capacity: null,
		priority: 0,
		obs: null,
		visible: true,
		latitude: null,
		longitude: null
	}}
	club={data.club}
	picture={null}
	surfaces={data.surfaces}
	{form}
	cancelHref={resolve('/(app)/playgrounds')}
	submitLabel={m.form_create()}
/>
