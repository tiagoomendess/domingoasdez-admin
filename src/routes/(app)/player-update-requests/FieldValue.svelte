<script lang="ts">
	import { A } from 'flowbite-svelte';
	import { formatDate } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { positionLabel } from '#lib/player-positions.ts';

	let {
		field,
		value,
		changed = false
	}: {
		field: string;
		value: string | null;
		/** Highlight the requested value of a change. */
		changed?: boolean;
	} = $props();
</script>

{#if value === null || value === ''}
	<span class="text-gray-400 italic dark:text-gray-500">{m.update_requests_empty_value()}</span>
{:else if field === 'picture'}
	<img
		src={value}
		alt=""
		class="size-28 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
		loading="lazy"
	/>
{:else}
	<span
		class={[
			'break-words',
			changed ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
		]}
	>
		{#if field === 'position'}
			{positionLabel(value)}
		{:else if field === 'birth_date'}
			{formatDate(value.slice(0, 10), getLocale())}
		{:else if field === 'facebook_profile'}
			<A
				href={value}
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary-700 hover:underline dark:text-primary-400">{value}</A
			>
		{:else}
			{value}
		{/if}
	</span>
{/if}
