<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Card,
		Heading,
		Helper,
		Label,
		Modal,
		Select,
		Textarea
	} from 'flowbite-svelte';
	import {
		CheckCircleOutline,
		CloseOutline,
		ExclamationCircleOutline,
		PlusOutline,
		ShieldCheckOutline
	} from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextareaField from '#lib/components/form/TextareaField.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const permissionError = $derived(
		form && 'permissionError' in form ? (form.permissionError as string) : null
	);
	const banError = $derived(form && 'banError' in form ? (form.banError as string) : null);

	let banOpen = $state(false);
	let pardonOpen = $state(false);
	let busy = $state(false);
	let newPermission = $state('');

	const PROVIDERS: Record<string, string> = { google: 'Google', facebook: 'Facebook' };
	const providerLabel = (provider: string) => PROVIDERS[provider] ?? provider;

	const submitting = () => {
		busy = true;
		return async ({ update }: { update: (options?: { reset?: boolean }) => Promise<void> }) => {
			await update();
			busy = false;
		};
	};

	const dl = 'grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm';
</script>

<PageHeader
	title={data.account.name || data.account.email || `#${data.account.id}`}
	back={resolve('/(app)/users')}
	backLabel={m.users_title()}
>
	{#snippet actions()}
		{#if data.canEdit && !data.isSelf}
			{#if data.banned}
				<Button color="alternative" class="gap-2" onclick={() => (pardonOpen = true)}>
					<CheckCircleOutline class="size-4" aria-hidden="true" />
					{m.users_pardon()}
				</Button>
			{:else}
				<Button color="red" outline class="gap-2" onclick={() => (banOpen = true)}>
					<ExclamationCircleOutline class="size-4" aria-hidden="true" />
					{m.users_ban()}
				</Button>
			{/if}
		{/if}
	{/snippet}
</PageHeader>

<!-- Who this is, at a glance. -->
<div class="-mt-2 mb-6 flex flex-wrap items-center gap-4">
	<img
		src={data.profile.pictureUrl}
		alt=""
		class="size-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
	/>
	<div class="min-w-0">
		<p class="text-sm break-all text-gray-600 dark:text-gray-400">{data.account.email ?? '—'}</p>
		<div class="mt-1 flex flex-wrap gap-2">
			{#if data.banned}
				<Badge color="red">{m.users_badge_banned()}</Badge>
			{/if}
			{#if data.account.verified}
				<Badge color="green">{m.users_badge_verified()}</Badge>
			{:else}
				<Badge color="gray">{m.users_badge_unverified()}</Badge>
			{/if}
			{#each data.account.providers as provider (provider)}
				<Badge color="indigo">{m.users_signs_in_with({ provider: providerLabel(provider) })}</Badge>
			{/each}
			{#if data.permissions.length}
				<Badge color="blue">{m.users_permission_count({ count: data.permissions.length })}</Badge>
			{/if}
		</div>
	</div>
</div>

{#if data.banned}
	{@const ban = data.bans.find((row) => !row.pardoned)}
	<Alert color="red" class="mb-6">
		<p class="font-medium">
			{m.users_banned_by({ name: ban?.bannedByName ?? '—' })}
			<DateTime value={ban?.createdAt} />
		</p>
		{#if ban}<p class="mt-1">{ban.reason}</p>{/if}
	</Alert>
{/if}

{#if !data.canEdit}
	<Alert color="blue" class="mb-6">{m.form_read_only()}</Alert>
{/if}

<div class="grid items-start gap-6 xl:grid-cols-3">
	<div class="space-y-6 xl:col-span-2">
		<!-- Permissions: what the account can do in the admin. -->
		<Card size="xl" class="p-6">
			<Heading tag="h2" class="mb-1 flex items-center gap-2 text-lg font-medium">
				<ShieldCheckOutline
					class="size-5 text-primary-600 dark:text-primary-400"
					aria-hidden="true"
				/>
				{m.users_permissions()}
			</Heading>
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{m.users_permissions_hint()}</p>

			{#if permissionError}
				<Alert color="red" class="mb-4 dark:bg-gray-800 dark:text-red-400">{permissionError}</Alert>
			{/if}

			{#if data.permissions.length === 0}
				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{m.users_no_permissions()}</p>
			{:else}
				<ul class="mb-5 flex flex-wrap gap-2">
					{#each data.permissions as permission (permission.id)}
						<li
							class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 ps-3 pe-1 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
						>
							<code class="text-xs">{permission.name}</code>
							{#if permission.removable}
								<form method="POST" action="?/revoke" use:enhance={submitting}>
									<input type="hidden" name="permission_id" value={permission.id} />
									<button
										type="submit"
										disabled={busy}
										class="rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/40 dark:hover:text-red-300"
										aria-label={m.users_revoke({ permission: permission.name })}
										title={m.users_revoke({ permission: permission.name })}
									>
										<CloseOutline class="size-3.5" aria-hidden="true" />
									</button>
								</form>
							{:else}
								<span class="w-1"></span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if data.canEdit && data.grantable.length}
				<form
					method="POST"
					action="?/grant"
					class="flex flex-wrap items-end gap-3"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update();
							busy = false;
							newPermission = '';
						};
					}}
				>
					<div class="min-w-56 flex-1">
						<Label for="permission_id" class="mb-2">{m.users_add_permission()}</Label>
						<Select
							id="permission_id"
							name="permission_id"
							bind:value={newPermission}
							placeholder=""
						>
							<option value="" disabled>{m.users_choose_permission()}</option>
							{#each data.grantable as permission (permission.id)}
								<option value={String(permission.id)}>{permission.name}</option>
							{/each}
						</Select>
					</div>
					<Button type="submit" class="gap-2" disabled={!newPermission || busy}>
						<PlusOutline class="size-4" aria-hidden="true" />
						{m.users_grant()}
					</Button>
				</form>
			{/if}
		</Card>
	</div>

	<aside class="space-y-6">
		<Card size="xl" class="p-6">
			<Heading tag="h2" class="mb-4 text-lg font-medium">{m.users_account()}</Heading>
			<dl class={dl}>
				<dt class="text-gray-500 dark:text-gray-400">{m.common_id()}</dt>
				<dd class="text-gray-900 tabular-nums dark:text-white">{data.account.id}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{m.users_email()}</dt>
				<dd class="break-all text-gray-900 dark:text-white">{data.account.email ?? '—'}</dd>
				<dt class="text-gray-500 dark:text-gray-400">{m.users_verified()}</dt>
				<dd class="text-gray-900 dark:text-white">
					{data.account.verified ? m.common_yes() : m.common_no()}
				</dd>
				<dt class="text-gray-500 dark:text-gray-400">{m.users_external_login()}</dt>
				<dd class="text-gray-900 dark:text-white">
					{data.account.providers.length
						? data.account.providers.map(providerLabel).join(', ')
						: m.common_no()}
				</dd>
				<dt class="text-gray-500 dark:text-gray-400">{m.users_password()}</dt>
				<dd class="text-gray-900 dark:text-white">
					{data.account.hasPassword ? m.users_password_set() : m.users_password_none()}
				</dd>
				{#if data.profile.timezone}
					<dt class="text-gray-500 dark:text-gray-400">{m.users_timezone()}</dt>
					<dd class="text-gray-900 dark:text-white">{data.profile.timezone}</dd>
				{/if}
				<dt class="text-gray-500 dark:text-gray-400">{m.common_created_at()}</dt>
				<dd class="text-gray-900 dark:text-white"><DateTime value={data.account.createdAt} /></dd>
				<dt class="text-gray-500 dark:text-gray-400">{m.common_updated_at()}</dt>
				<dd class="text-gray-900 dark:text-white"><DateTime value={data.account.updatedAt} /></dd>
			</dl>
		</Card>

		<Card size="xl" class="p-6">
			<Heading tag="h2" class="mb-4 text-lg font-medium">{m.users_bans()}</Heading>
			{#if data.bans.length === 0}
				<p class="text-sm text-gray-600 dark:text-gray-400">{m.users_no_bans()}</p>
			{:else}
				<ol class="space-y-3 text-sm">
					{#each data.bans as ban (ban.id)}
						<li
							class="border-s-2 ps-3 {ban.pardoned
								? 'border-gray-300 dark:border-gray-600'
								: 'border-red-500'}"
						>
							<p class="text-gray-900 dark:text-white">{ban.reason}</p>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{ban.bannedByName ?? '—'} · <DateTime value={ban.createdAt} />
								{#if ban.pardoned}
									· {m.users_ban_pardoned()} <DateTime value={ban.updatedAt} />
								{/if}
							</p>
						</li>
					{/each}
				</ol>
			{/if}
		</Card>
	</aside>
</div>

<!-- Profile: the fields the legacy page edited (picture, phone, bio). -->
<div class="mt-6">
	<EntityForm
		{form}
		action="?/profile"
		readonly={!data.canEdit}
		cancelHref={resolve('/(app)/users')}
	>
		<Card size="xl" class="p-6">
			<Heading tag="h2" class="mb-5 text-lg font-medium">{m.users_profile()}</Heading>
			<div class="grid gap-5 md:grid-cols-[6rem_1fr]">
				<img
					src={data.profile.pictureUrl}
					alt={m.users_picture()}
					class="size-24 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
				/>
				<div class="grid gap-5 md:grid-cols-2">
					<TextField
						name="picture"
						label={m.users_picture()}
						hint={m.users_picture_hint()}
						value={data.profile.picture}
						required
						maxlength={280}
						autocomplete="off"
						class="md:col-span-2"
					/>
					<TextField
						name="phone"
						type="tel"
						label={m.players_phone()}
						value={data.profile.phone}
						maxlength={14}
						autocomplete="off"
					/>
					<TextareaField
						name="bio"
						label={m.users_bio()}
						value={data.profile.bio}
						maxlength={280}
						class="md:col-span-2"
					/>
				</div>
			</div>
		</Card>
	</EntityForm>
</div>

<Modal bind:open={banOpen} size="sm" title={m.users_ban_title()} permanent={busy}>
	<form
		method="POST"
		action="?/ban"
		class="space-y-4"
		use:enhance={() => {
			busy = true;
			return async ({ result, update }) => {
				busy = false;
				if (result.type !== 'failure') banOpen = false;
				await update({ reset: false });
			};
		}}
	>
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.users_ban_text()}</p>
		{#if banError}
			<Alert color="red" class="dark:bg-gray-800 dark:text-red-400">{banError}</Alert>
		{/if}
		<div>
			<Label for="reason" class="mb-2">{m.users_ban_reason()}</Label>
			<Textarea id="reason" name="reason" rows={3} maxlength={155} required class="w-full" />
			<Helper class="mt-1">{m.users_ban_reason_hint()}</Helper>
		</div>
		<div class="flex justify-end gap-3">
			<Button type="button" color="alternative" disabled={busy} onclick={() => (banOpen = false)}>
				{m.form_cancel()}
			</Button>
			<Button type="submit" color="red" loading={busy}>{m.users_ban()}</Button>
		</div>
	</form>
</Modal>

<Modal bind:open={pardonOpen} size="sm" title={m.users_pardon_title()} permanent={busy}>
	<form
		method="POST"
		action="?/pardon"
		class="space-y-4"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				busy = false;
				pardonOpen = false;
				await update();
			};
		}}
	>
		<p class="text-sm text-gray-600 dark:text-gray-400">{m.users_pardon_text()}</p>
		<div class="flex justify-end gap-3">
			<Button
				type="button"
				color="alternative"
				disabled={busy}
				onclick={() => (pardonOpen = false)}
			>
				{m.form_cancel()}
			</Button>
			<Button type="submit" loading={busy}>{m.users_pardon()}</Button>
		</div>
	</form>
</Modal>
