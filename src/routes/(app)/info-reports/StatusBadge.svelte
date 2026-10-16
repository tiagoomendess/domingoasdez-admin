<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';

	type Status = 'sent' | 'seen' | 'used' | 'archived' | 'deleted';

	let { status, large = false }: { status: Status; large?: boolean } = $props();

	const badges = {
		sent: { color: 'yellow', label: m.info_reports_status_sent },
		seen: { color: 'blue', label: m.info_reports_status_seen },
		used: { color: 'green', label: m.info_reports_status_used },
		archived: { color: 'gray', label: m.info_reports_status_archived },
		deleted: { color: 'red', label: m.info_reports_status_deleted }
	} as const;

	const badge = $derived(badges[status]);
</script>

<Badge color={badge.color} {large}>{badge.label()}</Badge>
