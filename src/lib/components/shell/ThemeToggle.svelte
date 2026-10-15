<script lang="ts">
	import { MoonOutline, SunOutline } from 'flowbite-svelte-icons';
	import { m } from '#lib/paraglide/messages.js';
	import { toggleTheme } from '#lib/theme.ts';

	let { class: className = '' }: { class?: string } = $props();
</script>

<!--
	Both icons are rendered and CSS picks one, so the server markup is correct before the
	theme (cookie or OS preference) is known.
-->
<button
	type="button"
	class="inline-flex size-10 items-center justify-center rounded-lg focus:ring-2 focus:outline-none {className}"
	title={m.theme_toggle()}
	aria-label={m.theme_toggle()}
	onclick={toggleTheme}
>
	<MoonOutline class="size-5 dark:hidden" aria-hidden="true" />
	<SunOutline class="hidden size-5 dark:block" aria-hidden="true" />
</button>
