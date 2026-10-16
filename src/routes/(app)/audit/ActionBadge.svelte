<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { actionLabel } from './actions';

	let { action, large = false }: { action: string; large?: boolean } = $props();

	const colors: Record<string, 'green' | 'blue' | 'red' | 'yellow' | 'gray' | 'purple'> = {
		create: 'green',
		update: 'blue',
		delete: 'red',
		login_failed: 'yellow',
		login: 'purple',
		logout: 'purple'
	};
</script>

<Badge color={colors[action] ?? 'gray'} {large}>{actionLabel(action)}</Badge>
