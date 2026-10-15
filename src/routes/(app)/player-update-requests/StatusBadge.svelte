<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { status, large = false }: { status: 'pending' | 'approved' | 'denied'; large?: boolean } =
		$props();

	const badges = {
		pending: { color: 'yellow', label: m.update_requests_badge_pending },
		approved: { color: 'green', label: m.update_requests_badge_approved },
		denied: { color: 'red', label: m.update_requests_badge_denied }
	} as const;

	const badge = $derived(badges[status]);
</script>

<Badge color={badge.color} {large}>{badge.label()}</Badge>
