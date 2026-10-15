<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PollForm from '../PollForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader title={m.polls_new()} back={resolve('/(app)/polls')} backLabel={m.polls_title()} />

<PollForm
	poll={data.defaults}
	{form}
	cancelHref={resolve('/(app)/polls')}
	submitLabel={m.form_create()}
/>
