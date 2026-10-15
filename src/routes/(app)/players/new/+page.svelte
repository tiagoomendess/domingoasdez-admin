<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PlayerForm, { type PlayerValues } from '../PlayerForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	/** Same defaults as the legacy "create player" form. */
	const defaults: PlayerValues = {
		name: '',
		nickname: null,
		associationId: null,
		position: 'none',
		birthDate: '',
		phone: null,
		email: null,
		facebookProfile: null,
		obs: null,
		visible: true
	};
</script>

<PageHeader
	title={m.players_new()}
	back={resolve('/(app)/players')}
	backLabel={m.players_title()}
/>

<PlayerForm
	player={defaults}
	team={null}
	picture={null}
	{form}
	cancelHref={resolve('/(app)/players')}
	submitLabel={m.form_create()}
/>
