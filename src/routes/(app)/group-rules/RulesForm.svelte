<script lang="ts">
	import { Button, Card, Heading, Helper, Input, Label, Select, Textarea } from 'flowbite-svelte';
	import { PlusOutline, TrashBinOutline } from 'flowbite-svelte-icons';
	import { untrack } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import SelectField from '#lib/components/form/SelectField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import { isFormFailure } from '#lib/forms.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { ruleTypeOptions } from '#lib/rule-types.ts';

	export type RulesValues = {
		name: string;
		type: string;
		promotes: number;
		relegates: number;
		tieBreaker: 'none' | 'afpb' | 'custom';
		tieBreakerScript: string | null;
	};
	type Band = { key: number; positions: string; color: string; label: string };

	let {
		rules,
		positions,
		form,
		action,
		readonly = false,
		cancelHref,
		submitLabel
	}: {
		rules: RulesValues;
		positions: { positions: string; color: string; label: string }[];
		form: unknown;
		action?: string;
		readonly?: boolean;
		cancelHref: ResolvedPathname;
		submitLabel?: string;
	} = $props();

	const failure = $derived(isFormFailure(form) ? form : null);
	const errorsOf = (name: string) => failure?.errors[name] ?? [];

	let nextKey = 0;
	// The bands are edited here; the inputs post them as positions_N / color_N / label_N.
	let bands = $state<Band[]>(untrack(() => positions.map((band) => ({ key: nextKey++, ...band }))));
	let tieBreaker = $state(untrack(() => rules.tieBreaker));

	function addBand() {
		bands.push({ key: nextKey++, positions: '', color: '#99d98b', label: '' });
	}

	const tieBreakerOptions = [
		{ value: 'none', label: m.group_rules_tie_none() },
		{ value: 'afpb', label: m.group_rules_tie_afpb() },
		{ value: 'custom', label: m.group_rules_tie_custom() }
	];
</script>

<EntityForm {form} {action} {readonly} {cancelHref} {submitLabel}>
	<div class="grid items-start gap-6 xl:grid-cols-3">
		<Card size="xl" class="space-y-5 p-6 xl:col-span-2">
			<TextField
				name="name"
				label={m.common_name()}
				hint={m.group_rules_name_hint()}
				value={rules.name}
				required
				maxlength={154}
				autocomplete="off"
			/>
			<div class="grid gap-5 md:grid-cols-3">
				<SelectField
					name="type"
					label={m.group_rules_type()}
					value={rules.type}
					options={ruleTypeOptions()}
					required
				/>
				<TextField
					name="promotes"
					type="number"
					label={m.group_rules_promotes()}
					value={rules.promotes}
					required
					min={0}
					max={100}
				/>
				<TextField
					name="relegates"
					type="number"
					label={m.group_rules_relegates()}
					value={rules.relegates}
					required
					min={0}
					max={100}
				/>
			</div>

			<div>
				<Heading tag="h2" class="mb-1 text-lg font-medium">{m.group_rules_bands()}</Heading>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{m.group_rules_bands_hint()}</p>
				{#if bands.length === 0}
					<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{m.group_rules_no_bands()}</p>
				{/if}
				<ul class="space-y-3">
					{#each bands as band, index (band.key)}
						<li
							class="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[9rem_4rem_1fr_auto] md:items-start dark:border-gray-700"
						>
							<div>
								<Label for={`positions-${index}`} class="mb-1 text-xs"
									>{m.group_rules_positions()}</Label
								>
								<Input
									id={`positions-${index}`}
									name={`positions_${index}`}
									bind:value={band.positions}
									placeholder="1,2,3"
									autocomplete="off"
									color={errorsOf(`positions_${index}`).length ? 'red' : 'default'}
								/>
								{#each errorsOf(`positions_${index}`) as message (message)}
									<Helper color="red" class="mt-1">{message}</Helper>
								{/each}
							</div>
							<div>
								<Label for={`color-${index}`} class="mb-1 text-xs">{m.group_rules_color()}</Label>
								<input
									id={`color-${index}`}
									name={`color_${index}`}
									type="color"
									bind:value={band.color}
									class="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-700"
								/>
							</div>
							<div>
								<Label for={`label-${index}`} class="mb-1 text-xs">{m.group_rules_label()}</Label>
								<Input
									id={`label-${index}`}
									name={`label_${index}`}
									bind:value={band.label}
									maxlength={155}
									placeholder={m.group_rules_label_placeholder()}
									autocomplete="off"
									color={errorsOf(`label_${index}`).length ? 'red' : 'default'}
								/>
								{#each errorsOf(`label_${index}`) as message (message)}
									<Helper color="red" class="mt-1">{message}</Helper>
								{/each}
							</div>
							<div class="flex items-end gap-2 md:pt-5">
								<!-- How the band looks in a standings table. -->
								<span
									class="inline-flex h-10 items-center rounded-lg px-3 text-xs font-medium text-gray-900"
									style:background-color={band.color}
									title={m.group_rules_preview()}
								>
									{band.positions || '…'}
								</span>
								{#if !readonly}
									<Button
										type="button"
										color="alternative"
										class="h-10 px-3"
										aria-label={m.group_rules_remove_band()}
										onclick={() => bands.splice(index, 1)}
									>
										<TrashBinOutline class="size-4" aria-hidden="true" />
									</Button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
				{#if !readonly}
					<Button type="button" color="alternative" size="sm" class="mt-3 gap-2" onclick={addBand}>
						<PlusOutline class="size-4" aria-hidden="true" />
						{m.group_rules_add_band()}
					</Button>
				{/if}
			</div>
		</Card>

		<Card size="xl" class="space-y-4 p-6">
			<Heading tag="h2" class="text-lg font-medium">{m.group_rules_tie_breaker()}</Heading>
			<div>
				<Label for="tie_breaker" class="mb-2">{m.group_rules_tie_breaker_rule()}</Label>
				<Select id="tie_breaker" name="tie_breaker" bind:value={tieBreaker} placeholder="">
					{#each tieBreakerOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</Select>
				<Helper class="mt-1.5">{m.group_rules_tie_breaker_hint()}</Helper>
			</div>
			{#if tieBreaker === 'custom'}
				<div>
					<Label for="tie_breaker_script" class="mb-2">{m.group_rules_script()}</Label>
					<Textarea
						id="tie_breaker_script"
						name="tie_breaker_script"
						rows={6}
						value={failure?.values.tie_breaker_script ?? rules.tieBreakerScript ?? ''}
						class="w-full font-mono text-xs"
						color={errorsOf('tie_breaker_script').length ? 'red' : 'default'}
					/>
					<Helper class="mt-1.5">{m.group_rules_script_hint()}</Helper>
					{#each errorsOf('tie_breaker_script') as message (message)}
						<Helper color="red" class="mt-1">{message}</Helper>
					{/each}
				</div>
			{/if}
		</Card>
	</div>
</EntityForm>
