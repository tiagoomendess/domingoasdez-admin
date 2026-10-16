<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';

	let {
		status,
		large = false
	}: { status: 'waiting' | 'answered' | 'expired' | 'used'; large?: boolean } = $props();

	const badges = {
		waiting: { color: 'yellow', label: m.game_comments_badge_waiting },
		answered: { color: 'green', label: m.game_comments_badge_answered },
		expired: { color: 'gray', label: m.game_comments_badge_expired },
		used: { color: 'indigo', label: m.game_comments_badge_used }
	} as const;

	const badge = $derived(badges[status]);
</script>

<Badge color={badge.color} {large}>{badge.label()}</Badge>
