<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PostForm from '../PostForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageHeader
	title={m.social_posts_new()}
	back={resolve('/(app)/social-media-posts')}
	backLabel={m.social_posts_title()}
/>

<PostForm
	post={{
		platform: 'facebook',
		postType: 'post',
		postContentType: 'image',
		mediaPath: null,
		textContent: null,
		publishAt: data.publishAt
	}}
	{form}
	cancelHref={resolve('/(app)/social-media-posts')}
	submitLabel={m.form_create()}
/>
