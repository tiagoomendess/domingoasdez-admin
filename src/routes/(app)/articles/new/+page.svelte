<script lang="ts">
	import { resolve } from '$app/paths';
	import { can } from '#lib/auth/permissions.ts';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ArticleForm, { type ArticleValues } from '../ArticleForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Today in the admin's timezone, like the legacy date picker default. */
	const today = $derived(
		new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone }).format(new Date())
	);

	/** Same defaults as the legacy "create article" form. */
	const defaults: ArticleValues = $derived({
		title: '',
		description: null,
		text: '',
		date: today,
		tags: null,
		visible: true
	});
</script>

<PageHeader
	title={m.articles_new()}
	back={resolve('/(app)/articles')}
	backLabel={m.articles_title()}
/>

<ArticleForm
	article={defaults}
	cover={null}
	creating
	canUpload={can(data.user.permissions, 'media')}
	{form}
	cancelHref={resolve('/(app)/articles')}
	submitLabel={m.form_create()}
/>
