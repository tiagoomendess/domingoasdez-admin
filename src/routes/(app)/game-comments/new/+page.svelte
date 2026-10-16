<script lang="ts">
	import { Card, Radio } from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import FormField from '#lib/components/form/FormField.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { isFormFailure } from '#lib/forms.ts';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// "Home vs Away": the side choice names the clubs once a game is picked.
	let game = $state<Option | null>(null);
	const picked = $derived(game ?? data.game);
	const clubs = $derived(picked?.label.split(' vs ') ?? []);
	const side = $derived(
		(isFormFailure(form) ? form.values.side : undefined) === 'away' ? 'away' : 'home'
	);
</script>

<PageHeader
	title={m.game_comments_new()}
	back={resolve('/(app)/game-comments')}
	backLabel={m.nav_game_comments()}
/>

<EntityForm {form} cancelHref={resolve('/(app)/game-comments')} submitLabel={m.form_create()}>
	<Card size="xl" class="max-w-3xl space-y-5 p-6">
		<p class="text-sm text-gray-500 dark:text-gray-400">{m.game_comments_new_hint()}</p>
		<FormField name="game_id" label={m.game_comments_game()} required>
			{#snippet children(field)}
				<SearchSelect
					id={field.id}
					name="game_id"
					endpoint={resolve('/api/options/games')}
					value={data.game}
					label={m.game_comments_game()}
					placeholder={m.select_search_games()}
					required
					invalid={field.invalid}
					describedBy={field.describedBy}
					onchange={(option) => (game = option)}
				/>
			{/snippet}
		</FormField>
		<FormField name="side" label={m.game_comments_team()} required>
			{#snippet children(field)}
				<div
					id={field.id}
					role="radiogroup"
					aria-invalid={field.invalid || undefined}
					aria-describedby={field.describedBy}
					class="flex flex-wrap gap-6"
				>
					<Radio name="side" value="home" group={side}>
						{m.game_comments_home()}{clubs[0] ? ` · ${clubs[0]}` : ''}
					</Radio>
					<Radio name="side" value="away" group={side}>
						{m.game_comments_away()}{clubs[1] ? ` · ${clubs[1]}` : ''}
					</Radio>
				</div>
			{/snippet}
		</FormField>
		<TextField
			name="deadline"
			type="datetime-local"
			label={m.game_comments_deadline()}
			hint={m.game_comments_deadline_hint()}
			value={data.deadline}
			required
		/>
		<TextareaField
			name="content"
			label={m.game_comments_comment()}
			hint={m.game_comments_content_new_hint()}
			maxlength={1000}
			rows={5}
		/>
	</Card>
</EntityForm>
