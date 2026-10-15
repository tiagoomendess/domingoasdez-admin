<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { status, large = false }: { status: 'scheduled' | 'open' | 'closed'; large?: boolean } =
		$props();

	const badges = {
		scheduled: { color: 'yellow', label: m.polls_status_scheduled },
		open: { color: 'green', label: m.polls_status_open },
		closed: { color: 'gray', label: m.polls_status_closed }
	} as const;

	const badge = $derived(badges[status]);
</script>

<Badge color={badge.color} {large}>{badge.label()}</Badge>
