<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import type { PostStatus } from '#lib/server/social-media-posts/form.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { status, large = false }: { status: PostStatus; large?: boolean } = $props();

	const badges = {
		scheduled: { color: 'yellow', label: m.social_posts_badge_scheduled },
		prepared: { color: 'blue', label: m.social_posts_badge_prepared },
		published: { color: 'green', label: m.social_posts_badge_published },
		failed: { color: 'red', label: m.social_posts_badge_failed },
		missed: { color: 'gray', label: m.social_posts_badge_missed }
	} as const;

	const badge = $derived(badges[status]);
</script>

<Badge color={badge.color} {large}>{badge.label()}</Badge>
