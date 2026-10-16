<script lang="ts">
	import { Button, Input } from 'flowbite-svelte';
	import { RefreshOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import { fieldState, getFormContext } from '#lib/components/form/context.ts';
	import type { Option } from '#lib/options.ts';
	import { randomToken } from '#lib/token.ts';
	import { m } from '#lib/paraglide/messages.js';

	type Kind = 'secret' | 'game' | 'image' | 'counter' | 'text';

	let {
		kind,
		value,
		game = null,
		creating = false,
		readonly = false
	}: {
		kind: Kind;
		/** Stored value (`null` for a secret: it never reaches the page). */
		value: string | null;
		/** The `game` kind's current game, for the select's label. */
		game?: Option | null;
		creating?: boolean;
		readonly?: boolean;
	} = $props();

	let generated = $state('');

	const context = getFormContext();
	// After a rejected submission, keep what the admin typed.
	let image = $derived(fieldState(context, 'value').submitted ?? value ?? '');
</script>

{#if kind === 'secret'}
	<TextField
		name="value"
		label={m.settings_value()}
		value={generated}
		hint={generated
			? m.settings_generated_hint()
			: creating
				? m.settings_secret_hint_new()
				: m.settings_secret_hint()}
		required={creating}
		maxlength={255}
		autocomplete="off"
	/>
	{#if !readonly}
		<!-- Only fills the field: the admin copies it to the API clients, then saves. -->
		<Button
			type="button"
			color="alternative"
			size="sm"
			class="mt-3 gap-2"
			onclick={() => (generated = randomToken())}
		>
			<RefreshOutline class="size-4" aria-hidden="true" />
			{m.settings_generate_token()}
		</Button>
	{/if}
{:else if kind === 'game'}
	<FormField name="value" label={m.settings_game()} hint={m.settings_game_hint()} required>
		{#snippet children(field)}
			<SearchSelect
				id={field.id}
				name="value"
				endpoint={resolve('/api/options/games')}
				value={game}
				label={m.settings_game()}
				placeholder={m.select_search_games()}
				required
				invalid={field.invalid}
				describedBy={field.describedBy}
				disabled={readonly}
			/>
		{/snippet}
	</FormField>
{:else if kind === 'image'}
	<FormField name="value" label={m.settings_image_url()} hint={m.settings_image_hint()} required>
		{#snippet children(field)}
			<Input
				id={field.id}
				name="value"
				type="url"
				bind:value={image}
				required
				{readonly}
				maxlength={2048}
				aria-invalid={field.invalid}
				aria-describedby={field.describedBy}
			/>
		{/snippet}
	</FormField>
	{#if /^https?:\/\//.test(image)}
		<img
			src={image}
			alt={m.settings_image_preview()}
			class="mt-4 max-h-80 rounded-lg border border-gray-200 object-contain dark:border-gray-700"
			loading="lazy"
		/>
	{/if}
{:else if kind === 'counter'}
	<TextField
		name="value"
		type="number"
		label={m.settings_counter()}
		hint={m.settings_counter_hint()}
		{value}
		min={0}
		step={1}
		required
	/>
{:else}
	<TextareaField name="value" label={m.settings_value()} {value} rows={4} required />
{/if}
