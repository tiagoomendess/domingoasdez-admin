<script lang="ts">
	import { Alert, Badge, Button, Card, Heading } from 'flowbite-svelte';
	import {
		ArrowUpRightFromSquareOutline,
		CheckOutline,
		FileCopyOutline
	} from 'flowbite-svelte-icons';
	import { resolve } from '$app/paths';
	import DateTime from '#lib/components/DateTime.svelte';
	import DeleteButton from '#lib/components/form/DeleteButton.svelte';
	import EntityForm from '#lib/components/form/EntityForm.svelte';
	import TextField from '#lib/components/form/TextField.svelte';
	import ToggleField from '#lib/components/form/ToggleField.svelte';
	import PageHeader from '#lib/components/list/PageHeader.svelte';
	import { mediaTypeLabel } from '#lib/media-types.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const title = $derived(m.media_item_title({ id: data.media.id }));
	const otherUses = $derived(
		data.usage ? data.usage.texts + data.usage.records.reduce((sum, r) => sum + r.count, 0) : 0
	);

	let copied = $state(false);
	async function copyUrl() {
		await navigator.clipboard.writeText(data.media.url);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<PageHeader {title} back={resolve('/(app)/media')} backLabel={m.media_title()}>
	{#snippet actions()}
		{#if data.fileUrl}
			<Button
				href={data.fileUrl}
				target="_blank"
				rel="noopener noreferrer"
				color="alternative"
				class="gap-2"
			>
				<ArrowUpRightFromSquareOutline class="size-4" aria-hidden="true" />
				{m.media_open()}
			</Button>
		{/if}
		{#if data.canDelete}
			<DeleteButton title={m.media_delete_title({ id: data.media.id })}>
				{#if data.usage?.covers}
					<p>{m.media_delete_covers({ count: data.usage.covers })}</p>
				{/if}
				{#if otherUses}
					<p class="font-medium text-gray-900 dark:text-white">
						{m.media_delete_in_use({ count: otherUses })}
					</p>
				{/if}
			</DeleteButton>
		{/if}
	{/snippet}
</PageHeader>

{#if !data.canEdit}
	<Alert color="blue" class="mb-6">{m.media_not_owner()}</Alert>
{/if}

<!-- items-start: a stretched preview card would run under the save bar of the form beside it. -->
<div class="grid items-start gap-6 xl:grid-cols-3">
	<Card size="xl" class="p-4 xl:col-span-2">
		<div
			class="flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900"
		>
			{#if data.media.type === 'image' && data.fileUrl}
				<img src={data.fileUrl} alt="" class="max-h-[70vh] max-w-full object-contain" />
			{:else if data.media.type === 'video' && data.fileUrl}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video src={data.fileUrl} controls preload="metadata" class="max-h-[70vh] w-full"></video>
			{:else if data.youtubeId}
				<iframe
					src={`https://www.youtube-nocookie.com/embed/${data.youtubeId}`}
					title={data.media.tags}
					class="aspect-video w-full"
					loading="lazy"
					referrerpolicy="strict-origin-when-cross-origin"
					allow="encrypted-media; picture-in-picture"
					allowfullscreen
				></iframe>
			{:else if data.thumbnail}
				<img src={data.thumbnail} alt="" class="max-h-96 object-contain" />
			{/if}
		</div>
	</Card>

	<div class="space-y-6">
		<Card size="xl" class="p-6">
			<Heading tag="h2" class="mb-4 text-lg font-medium">{m.media_details()}</Heading>
			<dl class="space-y-3 text-sm">
				<div>
					<dt class="text-gray-500 dark:text-gray-400">{m.media_type()}</dt>
					<dd><Badge color="blue">{mediaTypeLabel(data.media.type)}</Badge></dd>
				</div>
				<div>
					<dt class="text-gray-500 dark:text-gray-400">{m.media_url()}</dt>
					<dd class="flex items-start gap-2">
						<code class="min-w-0 flex-1 break-all text-gray-900 dark:text-white"
							>{data.media.url}</code
						>
						<button
							type="button"
							class="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
							title={m.media_copy_url()}
							aria-label={m.media_copy_url()}
							onclick={copyUrl}
						>
							{#if copied}
								<CheckOutline class="size-4 text-green-600" aria-hidden="true" />
							{:else}
								<FileCopyOutline class="size-4" aria-hidden="true" />
							{/if}
						</button>
					</dd>
				</div>
				{#if data.thumbnail}
					<div>
						<dt class="mb-1 text-gray-500 dark:text-gray-400">{m.media_thumbnail()}</dt>
						<dd><img src={data.thumbnail} alt="" class="w-40 rounded-sm" loading="lazy" /></dd>
					</div>
				{/if}
				<div>
					<dt class="text-gray-500 dark:text-gray-400">{m.media_uploaded_by()}</dt>
					<dd class="text-gray-900 dark:text-white">
						{data.uploader ?? '—'} · <DateTime value={data.media.createdAt} />
					</dd>
				</div>
			</dl>
		</Card>

		<EntityForm
			{form}
			action="?/save"
			readonly={!data.canEdit}
			cancelHref={resolve('/(app)/media')}
		>
			<Card size="xl" class="space-y-4 p-6">
				<TextField
					name="tags"
					label={m.media_tags()}
					hint={m.media_tags_hint()}
					value={data.media.tags}
					maxlength={255}
					required
					autocomplete="off"
				/>
				<ToggleField
					name="visible"
					label={m.common_visible()}
					hint={m.media_visible_hint()}
					checked={data.media.visible}
				/>
			</Card>
		</EntityForm>
	</div>
</div>
