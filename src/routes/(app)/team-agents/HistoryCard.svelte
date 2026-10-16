<script lang="ts">
	import { Alert, Button, Card, Heading, Helper, Label, Modal, Select } from 'flowbite-svelte';
	import { EditOutline, ExclamationCircleOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { agentTypeLabel, agentTypeOptions } from '#lib/agent-types.ts';
	import SearchSelect from '#lib/components/SearchSelect.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import { formatDate } from '#lib/format.ts';
	import type { Option } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	type Entry = {
		id: number;
		teamId: number | null;
		agentType: string;
		startedOn: string;
		team: { label: string; image: string } | null;
	};

	let {
		history,
		canEdit,
		defaults,
		form
	}: {
		/** Newest first. */
		history: Entry[];
		canEdit: boolean;
		/** What a new entry starts with: the coach's current team and role. */
		defaults: { team: Option | null; agentType: string };
		form: unknown;
	} = $props();

	type HistoryFailure = {
		errors: Record<string, string[] | undefined>;
		values: Record<string, string>;
		message: string | null;
	};
	const failure = $derived(
		form && typeof form === 'object' && 'history' in form
			? (form as { history: HistoryFailure }).history
			: null
	);

	let open = $state(false);
	let submitting = $state(false);
	let editing = $state<Entry | null>(null);
	/** Remounts the modal fields with the values of the entry being edited. */
	let formKey = $state(0);

	const today = () => new Date().toISOString().slice(0, 10);

	function openAdd() {
		editing = null;
		formKey++;
		open = true;
	}

	function openEdit(entry: Entry) {
		editing = entry;
		formKey++;
		open = true;
	}

	const errorsOf = (name: string) => (open ? (failure?.errors[name] ?? []) : []);
</script>

<Card size="xl" class="mt-6 p-6">
	<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
		<div>
			<Heading tag="h2" class="text-lg font-medium">{m.team_agents_history()}</Heading>
			<p class="text-sm text-gray-500 dark:text-gray-400">{m.team_agents_history_hint()}</p>
		</div>
		{#if canEdit}
			<Button size="sm" color="alternative" class="gap-2" onclick={openAdd}>
				<PlusOutline class="size-4" aria-hidden="true" />
				{m.team_agents_history_add()}
			</Button>
		{/if}
	</div>

	{#if history.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.team_agents_history_empty()}</p>
	{:else}
		<!-- A timeline: newest at the top, each entry is a change of team or role. -->
		<ol class="relative ms-2 border-s border-gray-200 dark:border-gray-700">
			{#each history as entry, index (entry.id)}
				<li class="ms-6 pb-5 last:pb-0">
					<span
						class={[
							'absolute -start-1.5 mt-1.5 size-3 rounded-full border border-white dark:border-gray-800',
							index === 0 ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
						]}
					></span>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="min-w-0">
							<time class="text-xs text-gray-500 dark:text-gray-400">
								{formatDate(entry.startedOn, getLocale())}
							</time>
							<p class="flex flex-wrap items-center gap-2 text-sm text-gray-900 dark:text-white">
								{#if entry.team}
									<img src={entry.team.image} alt="" class="size-5 object-contain" />
									<span class="font-medium">{entry.team.label}</span>
								{:else}
									<span class="font-medium text-gray-500 italic dark:text-gray-400"
										>{m.team_agents_no_team()}</span
									>
								{/if}
								<span class="text-gray-500 dark:text-gray-400"
									>· {agentTypeLabel(entry.agentType)}</span
								>
							</p>
						</div>
						{#if canEdit}
							<div class="flex gap-2">
								<Button
									size="xs"
									color="alternative"
									class="gap-1.5"
									onclick={() => openEdit(entry)}
								>
									<EditOutline class="size-4" aria-hidden="true" />
									{m.form_edit()}
								</Button>
								<DeleteButton
									action={`?/deleteHistory&entry=${entry.id}`}
									title={m.team_agents_history_delete_title({
										date: formatDate(entry.startedOn, getLocale())
									})}
								/>
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</Card>

<Modal
	bind:open
	size="md"
	title={editing ? m.team_agents_history_edit() : m.team_agents_history_add()}
	permanent={submitting}
>
	{#key formKey}
		<form
			method="POST"
			action="?/saveHistory"
			novalidate
			class="space-y-5"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') open = false;
					await update({ reset: false });
				};
			}}
		>
			{#if editing}<input type="hidden" name="history_id" value={editing.id} />{/if}

			{#if open && failure?.message}
				<Alert color="red" class="flex items-start gap-2 dark:bg-gray-800 dark:text-red-400">
					<ExclamationCircleOutline class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
					<span>{failure.message}</span>
				</Alert>
			{/if}

			<div>
				<Label for="history-started-at" class="mb-2">{m.team_agents_history_started()}</Label>
				<input
					id="history-started-at"
					name="started_at"
					type="date"
					required
					value={editing?.startedOn ?? today()}
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				/>
				{#each errorsOf('started_at') as message (message)}
					<Helper color="red" class="mt-1">{message}</Helper>
				{/each}
			</div>

			<div>
				<Label for="history-team" class="mb-2">{m.players_team()}</Label>
				<SearchSelect
					id="history-team"
					name="team_id"
					endpoint={resolve('/api/options/teams')}
					value={editing
						? editing.team && editing.teamId
							? { value: editing.teamId, ...editing.team }
							: null
						: defaults.team}
					label={m.players_team()}
					placeholder={m.select_search_teams()}
					invalid={errorsOf('team_id').length > 0}
				/>
				<Helper class="mt-1">{m.team_agents_history_team_hint()}</Helper>
				{#each errorsOf('team_id') as message (message)}
					<Helper color="red" class="mt-1">{message}</Helper>
				{/each}
			</div>

			<div>
				<Label for="history-type" class="mb-2">{m.team_agents_type()}</Label>
				<Select
					id="history-type"
					name="agent_type"
					placeholder=""
					value={editing?.agentType ?? defaults.agentType}
				>
					{#each agentTypeOptions() as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</Select>
			</div>

			<div class="flex justify-end gap-3">
				<Button
					type="button"
					color="alternative"
					disabled={submitting}
					onclick={() => (open = false)}
				>
					{m.form_cancel()}
				</Button>
				<Button type="submit" loading={submitting}>{m.form_save()}</Button>
			</div>
		</form>
	{/key}
</Modal>
