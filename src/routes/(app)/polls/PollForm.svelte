<script lang="ts">
	import { Button, Card, Heading, Helper } from 'flowbite-svelte';
	import { MinusOutline, PlusOutline } from 'flowbite-svelte-icons';
	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';
	import DateTime from '#lib/components/DateTime.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import { isFormFailure } from '#lib/forms.ts';
	import { formatNumber } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	export type PollValues = {
		question: string;
		/** `datetime-local` values in the admin's timezone. */
		publishAfter: string;
		closeAfter: string;
		showResultsAfter: string;
	};

	export type PollResult = { id: number; answer: string; votes: number };

	const MIN_ANSWERS = 2;
	const MAX_ANSWERS = 40;

	let {
		poll,
		results = null,
		publishLocked = false,
		publishedAt = null,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		poll: PollValues;
		/** Edit: the answers with their votes (they can't change once created). Create: `null`. */
		results?: PollResult[] | null;
		/** The poll is out: its publish date can't change any more. */
		publishLocked?: boolean;
		publishedAt?: Date | string | null;
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();

	const failure = $derived(isFormFailure(form) ? form : null);

	/** After a rejected submission, as many answer fields as were sent (`answer_1` … `answer_N`). */
	function submittedAnswers(): number {
		if (!isFormFailure(form)) return MIN_ANSWERS;
		const sent = Object.keys(form.values).filter((name) => /^answer_\d+$/.test(name)).length;
		return Math.min(Math.max(sent, MIN_ANSWERS), MAX_ANSWERS);
	}

	// Answers are only added or removed at the end (like the legacy form), so field names, and the
	// values refilled by name after a failure, never shift.
	let answerCount = $state(submittedAnswers());

	const totalVotes = $derived(results?.reduce((sum, result) => sum + result.votes, 0) ?? 0);
	const percent = (votes: number) =>
		totalVotes
			? new Intl.NumberFormat(getLocale(), { style: 'percent' }).format(votes / totalVotes)
			: '';
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<div class="grid gap-6 xl:grid-cols-3">
		<Card size="xl" class="space-y-5 p-6 xl:col-span-2">
			<TextField
				name="question"
				label={m.polls_question()}
				hint={results ? m.polls_question_hint_edit() : m.polls_question_hint()}
				value={poll.question}
				required
				maxlength={144}
				autocomplete="off"
			/>

			<div>
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.polls_answers()}</Heading>
				{#if results}
					<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
						{m.polls_answers_locked()}
						{m.polls_total_votes({ count: formatNumber(totalVotes, getLocale()) })}
					</p>
					<ol class="space-y-3">
						{#each results as result, index (result.id)}
							<li>
								<div class="mb-1 flex items-baseline justify-between gap-4 text-sm">
									<span class="text-gray-900 dark:text-white">
										<span class="text-gray-500 tabular-nums dark:text-gray-400">{index + 1}.</span>
										{result.answer}
									</span>
									<span class="shrink-0 text-gray-600 tabular-nums dark:text-gray-400">
										{formatNumber(result.votes, getLocale())}
										{#if totalVotes}<span class="ms-1 text-xs">({percent(result.votes)})</span>{/if}
									</span>
								</div>
								<div class="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
									<div
										class="h-2 rounded-full bg-primary-600 dark:bg-primary-500"
										style:width={totalVotes ? `${(result.votes / totalVotes) * 100}%` : '0%'}
									></div>
								</div>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
						{m.polls_answers_hint({ min: MIN_ANSWERS, max: MAX_ANSWERS })}
					</p>
					<div class="space-y-4">
						{#each { length: answerCount }, index (index)}
							<TextField
								name={`answer_${index + 1}`}
								label={m.polls_answer_label({ number: index + 1 })}
								required
								maxlength={144}
								autocomplete="off"
							/>
						{/each}
					</div>
					{#if failure?.errors.answers?.length}
						<Helper color="red" class="mt-2" role="alert">{failure.errors.answers.join(' ')}</Helper
						>
					{/if}
					<div class="mt-4 flex flex-wrap gap-2">
						<Button
							color="alternative"
							size="sm"
							class="gap-2"
							disabled={answerCount >= MAX_ANSWERS}
							onclick={() => answerCount++}
						>
							<PlusOutline class="size-4" aria-hidden="true" />
							{m.polls_answer_add()}
						</Button>
						<Button
							color="alternative"
							size="sm"
							class="gap-2"
							disabled={answerCount <= MIN_ANSWERS}
							onclick={() => answerCount--}
						>
							<MinusOutline class="size-4" aria-hidden="true" />
							{m.polls_answer_remove()}
						</Button>
					</div>
				{/if}
			</div>
		</Card>

		<Card size="xl" class="space-y-4 p-6">
			<Heading tag="h2" class="mb-1 text-lg font-medium">{m.polls_section_dates()}</Heading>
			{#if publishLocked}
				<div>
					<p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
						{m.polls_publish_after()}
					</p>
					<p class="text-sm text-gray-700 dark:text-gray-300"><DateTime value={publishedAt} /></p>
					<Helper class="mt-1.5">{m.polls_publish_locked()}</Helper>
				</div>
			{:else}
				<TextField
					name="publish_after"
					type="datetime-local"
					label={m.polls_publish_after()}
					hint={m.polls_publish_after_hint()}
					value={poll.publishAfter}
					required
				/>
			{/if}
			<TextField
				name="close_after"
				type="datetime-local"
				label={m.polls_close_after()}
				hint={m.polls_close_after_hint()}
				value={poll.closeAfter}
				required
			/>
			<TextField
				name="show_results_after"
				type="datetime-local"
				label={m.polls_show_results_after()}
				hint={m.polls_show_results_after_hint()}
				value={poll.showResultsAfter}
				required
			/>
			<Helper>{m.polls_timezone_hint({ timezone: page.data.timezone })}</Helper>
		</Card>
	</div>
</EntityForm>
