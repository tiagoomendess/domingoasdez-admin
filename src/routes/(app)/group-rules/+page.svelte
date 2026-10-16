<script lang="ts">
	import {
		Badge,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import CreateButton from '#lib/components/list/CreateButton.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { ruleTypeLabel } from '#lib/rule-types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageHeader title={m.nav_group_rules()}>
	{#snippet actions()}
		<CreateButton
			href={resolve('/(app)/group-rules/new')}
			label={m.group_rules_new()}
			granted={data.user.permissions}
			permission="group_rules.create"
		/>
	{/snippet}
</PageHeader>

<div class="mb-4">
	<ListSearch q={data.list.q} placeholder={m.group_rules_search_placeholder()} />
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.group_rules_empty()} />
{:else}
	<Table hoverable shadow>
		<TableHead>
			<SortHeader
				state={data.list}
				column="id"
				label={m.common_id()}
				defaultDir="desc"
				class="w-20"
			/>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader state={data.list} column="type" label={m.group_rules_type()} class="w-36" />
			<TableHeadCell class="w-40">{m.group_rules_promotes_relegates()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="groups"
				label={m.nav_game_groups()}
				defaultDir="desc"
				class="w-28"
			/>
			<SortHeader
				state={data.list}
				column="updated_at"
				label={m.common_updated_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as rules (rules.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{rules.id}</TableBodyCell
					>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/group-rules/[id=id]', { id: rules.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{rules.name}
						</a>
						{#if rules.script}
							<Badge color="indigo" class="ms-2">{m.group_rules_has_tie_breaker()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell>{ruleTypeLabel(rules.type)}</TableBodyCell>
					<TableBodyCell class="tabular-nums"
						>↑ {rules.promotes} · ↓ {rules.relegates}</TableBodyCell
					>
					<TableBodyCell class="tabular-nums">{rules.groups}</TableBodyCell>
					<TableBodyCell><DateTime value={rules.updatedAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
