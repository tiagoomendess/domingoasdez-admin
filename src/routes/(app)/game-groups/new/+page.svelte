<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import GroupForm from '../GroupForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader
	title={m.game_groups_new()}
	back={resolve('/(app)/game-groups')}
	backLabel={m.nav_game_groups()}
/>

<GroupForm
	name=""
	season={data.season}
	rules={null}
	{form}
	cancelHref={resolve('/(app)/game-groups')}
	submitLabel={m.form_create()}
/>
