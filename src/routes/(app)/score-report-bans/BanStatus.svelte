<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { active, large = false }: { active: boolean; large?: boolean } = $props();
</script>

<Badge color={active ? 'red' : 'gray'} {large}>
	{active ? m.score_bans_active() : m.score_bans_expired()}
</Badge>
