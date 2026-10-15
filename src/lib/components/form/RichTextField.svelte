<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { Button, Input, Spinner } from 'flowbite-svelte';
	import {
		AlignCenterOutline,
		AlignJustifyOutline,
		AlignLeftOutline,
		AlignRightOutline,
		CodeOutline,
		ImageOutline,
		LetterBoldOutline,
		LetterItalicOutline,
		LetterUnderlineOutline,
		LinkOutline,
		MinusOutline,
		OrderedListOutline,
		ListOutline,
		QuoteOutline,
		RedoOutline,
		TableColumnOutline,
		TextSlashOutline,
		UndoOutline
	} from 'flowbite-svelte-icons';
	import { untrack, type Component } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import FormField from './FormField.svelte';
	import { fieldState, getFormContext } from './context';

	let {
		name,
		label,
		value = '',
		hint,
		required = false,
		uploadUrl,
		class: className = ''
	}: {
		name: string;
		label: string;
		/** Stored HTML, with upload paths already turned into loadable URLs. */
		value?: string;
		hint?: string;
		required?: boolean;
		/** Endpoint that stores a picked image and answers `{ url }`; no image button without it. */
		uploadUrl?: string;
		class?: string;
	} = $props();

	const context = getFormContext();
	const readonly = $derived(context?.readonly ?? false);

	// The submitted HTML after a rejected save, else the stored one. Read once: from here on the
	// editor owns the value.
	let html = $state(untrack(() => fieldState(context, name).submitted ?? value));
	let source = $state(false);
	let editor = $state.raw<Editor | null>(null);
	/** Bumped on every editor transaction, so the toolbar re-reads the active marks. */
	let revision = $state(0);

	let linkOpen = $state(false);
	let linkUrl = $state('');
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);

	/** Attachment that mounts Tiptap in the node (loaded in the browser only: it needs the DOM). */
	function mountEditor(element: HTMLDivElement) {
		let instance: Editor | null = null;
		let destroyed = false;
		Promise.all([import('@tiptap/core'), import('#lib/editor/extensions.ts')]).then(
			([{ Editor }, { articleExtensions }]) => {
				if (destroyed) return;
				instance = new Editor({
					element,
					extensions: articleExtensions(),
					content: untrack(() => html),
					editable: untrack(() => !readonly),
					editorProps: {
						attributes: {
							class:
								'prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-80 px-4 py-3 focus:outline-none',
							'aria-label': label,
							'aria-multiline': 'true',
							role: 'textbox'
						}
					},
					onUpdate: ({ editor: current }) => {
						html = current.isEmpty ? '' : current.getHTML();
					},
					onTransaction: () => {
						revision++;
					}
				});
				editor = instance;
			}
		);
		return () => {
			destroyed = true;
			instance?.destroy();
			editor = null;
		};
	}

	/** Active state of a mark/node for the toolbar (re-read on every transaction). */
	function active(
		nameOrAttributes: string | Record<string, unknown>,
		attributes?: Record<string, unknown>
	) {
		void revision;
		if (!editor) return false;
		return typeof nameOrAttributes === 'string'
			? editor.isActive(nameOrAttributes, attributes)
			: editor.isActive(nameOrAttributes);
	}

	const chain = () => editor!.chain().focus();

	const blockType = $derived.by(() => {
		void revision;
		if (!editor) return 'paragraph';
		for (const level of [2, 3, 4]) if (editor.isActive('heading', { level })) return `h${level}`;
		return 'paragraph';
	});

	function setBlockType(type: string) {
		if (type === 'paragraph') chain().setParagraph().run();
		else
			chain()
				.setHeading({ level: Number(type.slice(1)) as 2 | 3 | 4 })
				.run();
	}

	const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
	const fontSize = $derived.by(() => {
		void revision;
		return (editor?.getAttributes('textStyle').fontSize as string | undefined) ?? '';
	});

	function setFontSize(size: string) {
		if (size) chain().setFontSize(size).run();
		else chain().unsetFontSize().run();
	}

	const color = $derived.by(() => {
		void revision;
		return (editor?.getAttributes('textStyle').color as string | undefined) ?? '#000000';
	});

	function openLink() {
		linkUrl = (editor?.getAttributes('link').href as string | undefined) ?? '';
		linkOpen = true;
	}

	function applyLink() {
		const url = linkUrl.trim();
		if (url) chain().extendMarkRange('link').setLink({ href: url }).run();
		else chain().extendMarkRange('link').unsetLink().run();
		linkOpen = false;
	}

	function toggleSource() {
		if (source && editor) editor.commands.setContent(html, { emitUpdate: false });
		source = !source;
	}

	async function uploadImage(file: File) {
		if (!uploadUrl) return;
		uploading = true;
		uploadError = null;
		try {
			const body = new FormData();
			body.append('file', file);
			const response = await fetch(uploadUrl, { method: 'POST', body });
			const result = (await response.json().catch(() => null)) as {
				url?: string;
				message?: string;
			} | null;
			if (!response.ok || !result?.url) throw new Error(result?.message ?? m.form_upload_failed());
			chain().setImage({ src: result.url, alt: '' }).run();
		} catch (error) {
			uploadError = error instanceof Error ? error.message : m.form_upload_failed();
		} finally {
			uploading = false;
		}
	}

	type Tool = {
		label: string;
		icon?: Component;
		text?: string;
		isActive?: () => boolean;
		run: () => void;
	};

	const marks: Tool[] = [
		{
			label: m.editor_bold(),
			icon: LetterBoldOutline,
			isActive: () => active('bold'),
			run: () => chain().toggleBold().run()
		},
		{
			label: m.editor_italic(),
			icon: LetterItalicOutline,
			isActive: () => active('italic'),
			run: () => chain().toggleItalic().run()
		},
		{
			label: m.editor_underline(),
			icon: LetterUnderlineOutline,
			isActive: () => active('underline'),
			run: () => chain().toggleUnderline().run()
		},
		{
			label: m.editor_strike(),
			text: 'S',
			isActive: () => active('strike'),
			run: () => chain().toggleStrike().run()
		}
	];

	const alignments: Tool[] = (
		[
			['left', m.editor_align_left(), AlignLeftOutline],
			['center', m.editor_align_center(), AlignCenterOutline],
			['right', m.editor_align_right(), AlignRightOutline],
			['justify', m.editor_align_justify(), AlignJustifyOutline]
		] as const
	).map(([align, label, icon]) => ({
		label,
		icon,
		isActive: () => active({ textAlign: align }),
		run: () => chain().setTextAlign(align).run()
	}));

	const blocks: Tool[] = [
		{
			label: m.editor_bullet_list(),
			icon: ListOutline,
			isActive: () => active('bulletList'),
			run: () => chain().toggleBulletList().run()
		},
		{
			label: m.editor_ordered_list(),
			icon: OrderedListOutline,
			isActive: () => active('orderedList'),
			run: () => chain().toggleOrderedList().run()
		},
		{
			label: m.editor_quote(),
			icon: QuoteOutline,
			isActive: () => active('blockquote'),
			run: () => chain().toggleBlockquote().run()
		},
		{ label: m.editor_rule(), icon: MinusOutline, run: () => chain().setHorizontalRule().run() }
	];

	const tableTools: Tool[] = [
		{
			label: m.editor_table_row_add(),
			text: '+ ' + m.editor_table_row(),
			run: () => chain().addRowAfter().run()
		},
		{
			label: m.editor_table_row_delete(),
			text: '− ' + m.editor_table_row(),
			run: () => chain().deleteRow().run()
		},
		{
			label: m.editor_table_column_add(),
			text: '+ ' + m.editor_table_column(),
			run: () => chain().addColumnAfter().run()
		},
		{
			label: m.editor_table_column_delete(),
			text: '− ' + m.editor_table_column(),
			run: () => chain().deleteColumn().run()
		},
		{
			label: m.editor_table_delete(),
			text: m.editor_table_delete(),
			run: () => chain().deleteTable().run()
		}
	];

	const buttonClass = (on: boolean) => [
		'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary-300 focus:outline-none disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-primary-800',
		on && 'bg-gray-200 text-primary-700 dark:bg-gray-600 dark:text-primary-300'
	];
	const selectClass =
		'h-8 rounded-md border-gray-300 bg-white py-0 ps-2 pe-7 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
	const separator = 'mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600';
</script>

{#snippet tool(item: Tool)}
	<button
		type="button"
		class={buttonClass(item.isActive?.() ?? false)}
		title={item.label}
		aria-label={item.label}
		aria-pressed={item.isActive ? item.isActive() : undefined}
		disabled={!editor || source}
		onclick={item.run}
	>
		{#if item.icon}
			<item.icon class="size-5" aria-hidden="true" />
		{:else}
			<span class={item.text === 'S' ? 'font-semibold line-through' : 'text-xs font-medium'}>
				{item.text}
			</span>
		{/if}
	</button>
{/snippet}

<FormField {name} {label} {hint} {required} class={className}>
	{#snippet children(field)}
		<input type="hidden" {name} value={html} />
		<div
			class={[
				// No overflow-hidden here: it would become the scroll box of the sticky toolbar.
				'rounded-lg border bg-white dark:bg-gray-800',
				field.invalid
					? 'border-red-500 dark:border-red-500'
					: 'border-gray-300 focus-within:border-primary-500 dark:border-gray-600'
			]}
		>
			{#if !readonly}
				<div
					class="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-gray-200 bg-gray-50 p-1.5 dark:border-gray-600 dark:bg-gray-700"
					role="toolbar"
					aria-label={m.editor_toolbar()}
					aria-controls={field.id}
				>
					<select
						class={selectClass}
						aria-label={m.editor_block_type()}
						value={blockType}
						disabled={!editor || source}
						onchange={(event) => setBlockType(event.currentTarget.value)}
					>
						<option value="paragraph">{m.editor_paragraph()}</option>
						<option value="h2">{m.editor_heading({ level: 2 })}</option>
						<option value="h3">{m.editor_heading({ level: 3 })}</option>
						<option value="h4">{m.editor_heading({ level: 4 })}</option>
					</select>
					<select
						class={selectClass}
						aria-label={m.editor_font_size()}
						value={fontSize}
						disabled={!editor || source}
						onchange={(event) => setFontSize(event.currentTarget.value)}
					>
						<option value="">{m.editor_font_size_default()}</option>
						{#each FONT_SIZES as size (size)}
							<option value={size}>{size}</option>
						{/each}
					</select>
					<span class={separator}></span>
					{#each marks as item (item.label)}{@render tool(item)}{/each}
					<label class={[buttonClass(false), 'relative cursor-pointer']} title={m.editor_color()}>
						<span class="sr-only">{m.editor_color()}</span>
						<span
							class="size-4 rounded-sm border border-gray-400"
							style:background-color={color}
							aria-hidden="true"
						></span>
						<input
							type="color"
							class="absolute inset-0 cursor-pointer opacity-0"
							value={color}
							disabled={!editor || source}
							oninput={(event) => chain().setColor(event.currentTarget.value).run()}
						/>
					</label>
					<button
						type="button"
						class={buttonClass(false)}
						title={m.editor_clear_format()}
						aria-label={m.editor_clear_format()}
						disabled={!editor || source}
						onclick={() => chain().unsetAllMarks().clearNodes().run()}
					>
						<TextSlashOutline class="size-5" aria-hidden="true" />
					</button>
					<span class={separator}></span>
					{#each alignments as item (item.label)}{@render tool(item)}{/each}
					<span class={separator}></span>
					{#each blocks as item (item.label)}{@render tool(item)}{/each}
					<span class={separator}></span>
					<button
						type="button"
						class={buttonClass(active('link'))}
						title={m.editor_link()}
						aria-label={m.editor_link()}
						aria-expanded={linkOpen}
						disabled={!editor || source}
						onclick={openLink}
					>
						<LinkOutline class="size-5" aria-hidden="true" />
					</button>
					{#if uploadUrl}
						<label
							class={[
								buttonClass(false),
								'cursor-pointer focus-within:ring-2 focus-within:ring-primary-300 dark:focus-within:ring-primary-800',
								(!editor || source || uploading) && 'pointer-events-none opacity-40'
							]}
							title={m.editor_image()}
						>
							{#if uploading}
								<Spinner size="4" />
							{:else}
								<ImageOutline class="size-5" aria-hidden="true" />
							{/if}
							<input
								type="file"
								accept="image/jpeg,image/png"
								class="sr-only"
								aria-label={m.editor_image()}
								disabled={!editor || source || uploading}
								onchange={(event) => {
									const file = event.currentTarget.files?.[0];
									event.currentTarget.value = '';
									if (file) uploadImage(file);
								}}
							/>
						</label>
					{/if}
					<button
						type="button"
						class={buttonClass(false)}
						title={m.editor_table()}
						aria-label={m.editor_table()}
						disabled={!editor || source}
						onclick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
					>
						<TableColumnOutline class="size-5" aria-hidden="true" />
					</button>
					<span class={separator}></span>
					<button
						type="button"
						class={buttonClass(false)}
						title={m.editor_undo()}
						aria-label={m.editor_undo()}
						disabled={!editor || source}
						onclick={() => chain().undo().run()}
					>
						<UndoOutline class="size-5" aria-hidden="true" />
					</button>
					<button
						type="button"
						class={buttonClass(false)}
						title={m.editor_redo()}
						aria-label={m.editor_redo()}
						disabled={!editor || source}
						onclick={() => chain().redo().run()}
					>
						<RedoOutline class="size-5" aria-hidden="true" />
					</button>
					<button
						type="button"
						class={[buttonClass(source), 'ms-auto']}
						title={m.editor_source()}
						aria-label={m.editor_source()}
						aria-pressed={source}
						disabled={!editor}
						onclick={toggleSource}
					>
						<CodeOutline class="size-5" aria-hidden="true" />
					</button>
				</div>

				{#if active('table') && !source}
					<div
						class="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-1.5 py-1 dark:border-gray-600 dark:bg-gray-700"
						role="toolbar"
						aria-label={m.editor_table()}
					>
						{#each tableTools as item (item.label)}{@render tool(item)}{/each}
					</div>
				{/if}

				{#if linkOpen}
					<!-- Not a <form>: this sits inside the article form. Enter applies, Escape closes. -->
					<div
						class="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700"
					>
						<Input
							type="url"
							size="sm"
							class="min-w-60 flex-1"
							placeholder="https://"
							aria-label={m.editor_link_url()}
							bind:value={linkUrl}
							onkeydown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									applyLink();
								} else if (event.key === 'Escape') {
									linkOpen = false;
								}
							}}
						/>
						<Button type="button" size="xs" onclick={applyLink}>{m.editor_link_apply()}</Button>
						<Button type="button" size="xs" color="alternative" onclick={() => (linkOpen = false)}>
							{m.form_cancel()}
						</Button>
					</div>
				{/if}

				{#if uploadError}
					<p
						class="border-b border-gray-200 px-3 py-2 text-sm text-red-600 dark:border-gray-600 dark:text-red-400"
						role="alert"
					>
						{uploadError}
					</p>
				{/if}
			{/if}

			{#if source}
				<textarea
					class="block min-h-80 w-full resize-y rounded-b-lg border-0 bg-white px-4 py-3 font-mono text-sm text-gray-900 focus:ring-0 dark:bg-gray-800 dark:text-gray-100"
					aria-label={m.editor_source()}
					spellcheck="false"
					bind:value={html}></textarea>
			{/if}
			{#if !editor}
				<p
					class="flex min-h-80 items-center justify-center text-sm text-gray-500 dark:text-gray-400"
				>
					<Spinner size="5" class="me-2" />{m.editor_loading()}
				</p>
			{/if}
			<div
				id={field.id}
				{@attach mountEditor}
				class={['article-editor', source && 'hidden']}
				aria-invalid={field.invalid || undefined}
				aria-describedby={field.describedBy}
			></div>
		</div>
	{/snippet}
</FormField>

<style>
	/* Tables and the selected cell, which the typography plugin does not cover inside the editor. */
	.article-editor :global(table) {
		border-collapse: collapse;
		width: 100%;
	}
	.article-editor :global(td),
	.article-editor :global(th) {
		border: 1px solid var(--color-gray-300);
		padding: 0.25rem 0.5rem;
		position: relative;
		vertical-align: top;
	}
	:global(.dark) .article-editor :global(td),
	:global(.dark) .article-editor :global(th) {
		border-color: var(--color-gray-600);
	}
	.article-editor :global(.selectedCell)::after {
		background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
		content: '';
		inset: 0;
		pointer-events: none;
		position: absolute;
	}
	.article-editor :global(img.ProseMirror-selectednode),
	.article-editor :global(video.ProseMirror-selectednode) {
		outline: 3px solid var(--color-primary-500);
	}
	.article-editor :global(video) {
		max-width: 100%;
	}
</style>
