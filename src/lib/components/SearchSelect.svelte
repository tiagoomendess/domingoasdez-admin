<script lang="ts" module>
	/** Wait after the last keystroke before searching. */
	export const SEARCH_DEBOUNCE_MS = 300;
	/** Load the next page when the list is scrolled this close to its end (px). */
	const LOAD_MORE_THRESHOLD = 48;
</script>

<script lang="ts">
	import { Input, Spinner } from 'flowbite-svelte';
	import {
		CheckOutline,
		ChevronDownOutline,
		CloseOutline,
		SearchOutline
	} from 'flowbite-svelte-icons';
	import { onDestroy, tick, untrack } from 'svelte';
	import type { Option, OptionsPage } from '#lib/options.ts';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Searchable, lazy-loaded select of a related entity (combobox ARIA pattern). Options come
	 * from `GET <endpoint>?q=&page=` (see `#lib/server/options.ts`); the chosen id is submitted
	 * through a hidden input named `name`.
	 */
	let {
		name,
		endpoint,
		value = $bindable(null),
		id = `field-${name}`,
		placeholder = m.select_placeholder(),
		label,
		required = false,
		disabled = false,
		invalid = false,
		describedBy,
		clearable = !required,
		params,
		noneLabel,
		onchange
	}: {
		name: string;
		/** e.g. `resolve('/api/options/clubs')`. */
		endpoint: string;
		/** The selected option. Pass the current one from `load` so edit forms need no request. */
		value?: Option | null;
		id?: string;
		placeholder?: string;
		/** Accessible name of the list of options (the field label). */
		label?: string;
		required?: boolean;
		disabled?: boolean;
		invalid?: boolean;
		describedBy?: string;
		/** Allow going back to "nothing selected". Defaults to `!required`. */
		clearable?: boolean;
		/** Extra query parameters for the endpoint (e.g. a filter by team); the list reloads when they change. */
		params?: Record<string, string>;
		/** A clearable select lists this first (e.g. "Sem equipa") to go back to nothing selected. */
		noneLabel?: string;
		onchange?: (option: Option | null) => void;
	} = $props();

	const listboxId = $derived(`${id}-listbox`);
	const optionId = (index: number) => `${id}-option-${index}`;

	let root = $state<HTMLDivElement>();
	let input = $state<HTMLInputElement>();
	let listbox = $state<HTMLUListElement>();

	let text = $state(untrack(() => value?.label ?? ''));
	/** The admin typed since the last selection: search with `text` instead of listing all. */
	let typing = $state(false);
	let open = $state(false);
	let items = $state<Option[]>([]);
	let hasMore = $state(false);
	let page = $state(0);
	/** Search text of `items`; `null` until something was loaded. */
	let query = $state<string | null>(null);
	/** `params` of `items`: a different filter makes the loaded options stale. */
	let loadedParams = $state('');
	const paramsKey = $derived(JSON.stringify(params ?? {}));
	let loading = $state(false);
	let failed = $state(false);
	let activeIndex = $state(-1);

	let controller: AbortController | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Follow a new value from the page (e.g. after navigation), unless the list is in use.
	let shownValue = untrack(() => value);
	$effect.pre(() => {
		if (value === shownValue) return;
		shownValue = value;
		if (!open) text = value?.label ?? '';
	});

	const status = $derived.by(() => {
		if (!open) return '';
		if (loading) return m.select_loading();
		if (failed) return m.select_error();
		if (query !== null && items.length === 0) return m.select_no_results();
		return query === null ? '' : m.select_results({ count: items.length });
	});

	async function load(q: string, nextPage: number) {
		controller?.abort();
		const current = new AbortController();
		controller = current;
		loading = true;
		failed = false;
		try {
			const url = new URL(endpoint, window.location.origin);
			if (q) url.searchParams.set('q', q);
			if (nextPage > 1) url.searchParams.set('page', String(nextPage));
			for (const [key, param] of Object.entries(params ?? {})) url.searchParams.set(key, param);
			const response = await fetch(url, {
				signal: current.signal,
				headers: { accept: 'application/json' }
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result = (await response.json()) as OptionsPage;

			if (nextPage === 1) {
				items = result.items;
				const selectedIndex = items.findIndex((item) => item.value === value?.value);
				activeIndex = selectedIndex >= 0 ? selectedIndex : items.length ? 0 : -1;
				listbox?.scrollTo({ top: 0 });
			} else {
				// Rows can shift between pages while the table changes: never repeat an option.
				const seen = new Set(items.map((item) => item.value));
				items = [...items, ...result.items.filter((item) => !seen.has(item.value))];
			}
			hasMore = result.hasMore;
			page = nextPage;
			query = q;
			loadedParams = paramsKey;
		} catch {
			if (current.signal.aborted) return;
			failed = true;
			if (nextPage === 1) {
				items = [];
				hasMore = false;
				page = 0;
				query = q;
				loadedParams = paramsKey;
			}
		} finally {
			if (controller === current) {
				controller = null;
				loading = false;
			}
		}
	}

	const searchText = () => (typing ? text.trim() : '');

	function openList() {
		if (disabled || open) return;
		open = true;
		const q = searchText();
		if (query !== q || failed || loadedParams !== paramsKey) load(q, 1);
		else if (activeIndex < 0 && items.length) activeIndex = 0;
	}

	function close() {
		clearTimeout(timer);
		if (controller) {
			controller.abort();
			controller = null;
			loading = false;
		}
		open = false;
		typing = false;
		activeIndex = -1;
		text = value?.label ?? '';
	}

	function select(option: Option) {
		value = option;
		shownValue = option;
		close();
		onchange?.(option);
	}

	function clear() {
		value = null;
		shownValue = null;
		close();
		onchange?.(null);
		input?.focus();
	}

	/** The admin emptied the text of an optional selection: leaving or confirming clears it. */
	const emptied = () => clearable && typing && !text.trim() && value !== null;

	/** Leaves the list, clearing an emptied optional selection instead of restoring it. */
	function commitEmpty() {
		value = null;
		shownValue = null;
		close();
		onchange?.(null);
	}

	/** Repeats the request that failed: the first page, or the next one. */
	function retry() {
		load(query ?? searchText(), items.length ? page + 1 : 1);
	}

	function loadMore() {
		if (!hasMore || loading || query === null) return;
		load(query, page + 1);
	}

	async function moveTo(index: number) {
		activeIndex = index;
		if (index >= items.length - 3) loadMore();
		await tick();
		document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' });
	}

	function oninput() {
		typing = true;
		open = true;
		activeIndex = -1;
		clearTimeout(timer);
		timer = setTimeout(() => load(text.trim(), 1), SEARCH_DEBOUNCE_MS);
	}

	function onkeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!open) openList();
				else if (items.length) moveTo(Math.min(items.length - 1, activeIndex + 1));
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (!open) openList();
				else if (items.length) moveTo(Math.max(0, activeIndex - 1));
				break;
			case 'Enter':
				if (!open) return;
				// Never submit the form while choosing.
				event.preventDefault();
				// Emptied text means "nothing", not the first option of the full list.
				if (emptied()) commitEmpty();
				else if (items[activeIndex]) select(items[activeIndex]);
				break;
			case 'Escape':
				if (!open) return;
				event.preventDefault();
				event.stopPropagation();
				close();
				break;
			case 'Tab':
				// `close()` would put the old label back before the field loses focus.
				if (open && emptied()) commitEmpty();
				else if (open) close();
				break;
		}
	}

	function onfocusout(event: FocusEvent) {
		if (root?.contains(event.relatedTarget as Node | null)) return;
		// Emptying the text and leaving the field clears an optional selection.
		if (open && emptied()) commitEmpty();
		else if (open) close();
	}

	function onscroll() {
		if (!listbox) return;
		const remaining = listbox.scrollHeight - listbox.scrollTop - listbox.clientHeight;
		if (remaining <= LOAD_MORE_THRESHOLD) loadMore();
	}

	onDestroy(() => {
		clearTimeout(timer);
		controller?.abort();
	});

	const showImage = $derived(!typing && Boolean(value?.image));
</script>

<div bind:this={root} class="relative" {onfocusout}>
	<input type="hidden" {name} value={value?.value ?? ''} />

	<Input color={invalid ? 'red' : 'default'} {disabled}>
		{#snippet left()}
			{#if showImage}
				<img src={value?.image} alt="" class="size-5 object-contain" />
			{:else}
				<SearchOutline class="size-4" aria-hidden="true" />
			{/if}
		{/snippet}
		{#snippet children(props)}
			<input
				bind:this={input}
				bind:value={text}
				{id}
				type="text"
				class={[props.class, 'ps-10', clearable && value ? 'pe-16' : 'pe-10']}
				role="combobox"
				aria-expanded={open}
				aria-controls={listboxId}
				aria-autocomplete="list"
				aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
				aria-invalid={invalid || undefined}
				aria-required={required || undefined}
				aria-describedby={describedBy}
				autocomplete="off"
				spellcheck="false"
				{placeholder}
				{disabled}
				{oninput}
				{onkeydown}
				onclick={openList}
			/>
		{/snippet}
		{#snippet right()}
			<div class="flex items-center gap-1">
				{#if loading && open}
					<Spinner size="4" aria-hidden="true" />
				{/if}
				{#if clearable && value && !disabled}
					<button
						type="button"
						tabindex="-1"
						class="rounded p-0.5 hover:text-gray-900 dark:hover:text-white"
						aria-label={m.select_clear()}
						onclick={clear}
					>
						<CloseOutline class="size-4" aria-hidden="true" />
					</button>
				{/if}
				<button
					type="button"
					tabindex="-1"
					class="rounded p-0.5 hover:text-gray-900 disabled:pointer-events-none dark:hover:text-white"
					aria-label={m.select_toggle()}
					{disabled}
					onmousedown={(event) => event.preventDefault()}
					onclick={() => {
						input?.focus();
						if (open) close();
						else openList();
					}}
				>
					<ChevronDownOutline
						class={['size-4 transition-transform', open && 'rotate-180']}
						aria-hidden="true"
					/>
				</button>
			</div>
		{/snippet}
	</Input>

	{#if open}
		<ul
			bind:this={listbox}
			id={listboxId}
			role="listbox"
			aria-label={label}
			class="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-700"
			{onscroll}
		>
			{#if noneLabel && clearable && value && (!typing || !text.trim())}
				<li role="presentation">
					<button
						type="button"
						tabindex="-1"
						class="w-full px-3 py-2 text-start text-gray-600 italic hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600"
						onmousedown={(event) => event.preventDefault()}
						onclick={commitEmpty}
					>
						{noneLabel}
					</button>
				</li>
			{/if}
			{#each items as item, index (item.value)}
				{@const selected = item.value === value?.value}
				<!-- Keyboard selection happens on the input (aria-activedescendant). -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id={optionId(index)}
					role="option"
					aria-selected={selected}
					class={[
						'flex cursor-pointer items-center gap-3 px-3 py-2 text-gray-900 dark:text-white',
						index === activeIndex && 'bg-gray-100 dark:bg-gray-600'
					]}
					onmousedown={(event) => event.preventDefault()}
					onmousemove={() => (activeIndex = index)}
					onclick={() => select(item)}
				>
					{#if item.image}
						<img src={item.image} alt="" class="size-6 shrink-0 object-contain" loading="lazy" />
					{/if}
					<span class="min-w-0 flex-1">
						<span class={['block truncate', selected && 'font-medium']}>{item.label}</span>
						{#if item.description}
							<span class="block truncate text-xs text-gray-500 dark:text-gray-400">
								{item.description}
							</span>
						{/if}
					</span>
					{#if selected}
						<CheckOutline class="size-4 shrink-0 text-primary-700 dark:text-primary-400" />
					{/if}
				</li>
			{/each}
			{#if loading}
				<li
					role="presentation"
					class="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400"
				>
					<Spinner size="4" />
					{m.select_loading()}
				</li>
			{:else if failed}
				<li role="presentation" class="px-3 py-2 text-red-700 dark:text-red-400">
					{m.select_error()}
					<button
						type="button"
						class="ms-1 font-medium underline"
						onmousedown={(event) => event.preventDefault()}
						onclick={retry}
					>
						{m.select_retry()}
					</button>
				</li>
			{:else if query !== null && items.length === 0}
				<li role="presentation" class="px-3 py-2 text-gray-500 dark:text-gray-400">
					{m.select_no_results()}
				</li>
			{/if}
		</ul>
	{/if}

	<span class="sr-only" role="status" aria-live="polite">{status}</span>
</div>
