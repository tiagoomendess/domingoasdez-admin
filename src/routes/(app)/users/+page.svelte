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
	import { ShieldCheckOutline } from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import EmptyState from '#lib/components/list/EmptyState.svelte';
	import ListFilter from '#lib/components/list/ListFilter.svelte';
	import ListPagination from '#lib/components/list/ListPagination.svelte';
	import ListSearch from '#lib/components/list/ListSearch.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import SortHeader from '#lib/components/list/SortHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusOptions = [
		{ value: 'unverified', label: m.users_status_unverified() },
		{ value: 'banned', label: m.users_status_banned() },
		{ value: 'all', label: m.users_status_all() }
	];
	const staffOptions = [{ value: '1', label: m.users_with_permissions() }];
</script>

<!-- Accounts are created on the public site: there is no "new user" here, as on the legacy site. -->
<PageHeader title={m.users_title()} />

<div class="mb-4 flex flex-wrap gap-3">
	<ListSearch q={data.list.q} placeholder={m.users_search_placeholder()} />
	<!-- Verified accounts are the default, like the legacy list. -->
	<ListFilter
		name="status"
		value={data.status === 'verified' ? null : data.status}
		label={m.users_status()}
		allLabel={m.users_status_verified()}
		options={statusOptions}
		class="w-48"
	/>
	<ListFilter
		name="has_permissions"
		value={data.hasPermissions ? '1' : null}
		label={m.users_permissions()}
		allLabel={m.users_any_permissions()}
		options={staffOptions}
		class="w-52"
	/>
</div>

{#if data.rows.length === 0}
	<EmptyState q={data.list.q} message={m.users_empty()} />
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
			<TableHeadCell class="w-16"><span class="sr-only">{m.users_picture()}</span></TableHeadCell>
			<SortHeader state={data.list} column="name" label={m.common_name()} />
			<SortHeader state={data.list} column="email" label={m.users_email()} class="w-72" />
			<TableHeadCell class="w-40">{m.users_status()}</TableHeadCell>
			<SortHeader
				state={data.list}
				column="created_at"
				label={m.common_created_at()}
				defaultDir="desc"
				class="w-44"
			/>
		</TableHead>
		<TableBody>
			{#each data.rows as user (user.id)}
				<TableBodyRow>
					<TableBodyCell class="text-gray-500 tabular-nums dark:text-gray-400"
						>{user.id}</TableBodyCell
					>
					<TableBodyCell class="py-2">
						<img
							src={user.picture}
							alt=""
							class="size-10 max-w-none min-w-10 rounded-full object-cover"
							loading="lazy"
						/>
					</TableBodyCell>
					<TableBodyCell class="whitespace-normal">
						<a
							href={resolve('/(app)/users/[id=id]', { id: user.id })}
							class="font-medium text-gray-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
						>
							{user.name || '—'}
						</a>
						{#if user.permissions > 0}
							<span
								class="ms-1 inline-flex items-center gap-1 text-xs text-primary-700 dark:text-primary-400"
								title={m.users_permission_count({ count: user.permissions })}
							>
								<ShieldCheckOutline class="size-4" aria-hidden="true" />
								{user.permissions}
							</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell class="break-all whitespace-normal text-gray-600 dark:text-gray-400">
						{user.email ?? '—'}
					</TableBodyCell>
					<TableBodyCell>
						{#if user.banned}
							<Badge color="red">{m.users_badge_banned()}</Badge>
						{:else if user.verified}
							<Badge color="green">{m.users_badge_verified()}</Badge>
						{:else}
							<Badge color="gray">{m.users_badge_unverified()}</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell><DateTime value={user.createdAt} /></TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

<ListPagination state={data.list} />
