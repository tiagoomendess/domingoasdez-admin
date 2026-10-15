<script lang="ts">
	import { PaginationItem } from 'flowbite-svelte';
	import { ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';
	import { page as pageState } from '$app/state';
	import { listHref, pageRange, pageWindow, type ListState } from '#lib/list.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	let { state }: { state: ListState } = $props();

	const range = $derived(pageRange(state));
	const pages = $derived(pageWindow(state.page, state.pageCount));
	const href = (n: number) => listHref(pageState.url, { page: n === 1 ? null : n });

	const itemClass = 'h-9 min-w-9 justify-center rounded-none px-3';
</script>

{#if state.total > 0}
	<div
		class="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-gray-600 sm:flex-row dark:text-gray-400"
	>
		<p>
			{m.list_showing({
				from: range.from.toLocaleString(getLocale()),
				to: range.to.toLocaleString(getLocale()),
				total: state.total.toLocaleString(getLocale())
			})}
		</p>

		{#if state.pageCount > 1}
			<nav aria-label={m.list_pagination()}>
				<ul class="inline-flex -space-x-px">
					<li>
						{#if state.page > 1}
							<PaginationItem
								href={href(state.page - 1)}
								rel="prev"
								class="{itemClass} rounded-s-lg"
								aria-label={m.list_previous()}
							>
								<ChevronLeftOutline class="size-4" aria-hidden="true" />
							</PaginationItem>
						{:else}
							<span
								class="{itemClass} flex items-center rounded-s-lg border border-gray-300 bg-white text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600"
								aria-hidden="true"
							>
								<ChevronLeftOutline class="size-4" />
							</span>
						{/if}
					</li>
					{#each pages as n, index (n ?? `gap-${index}`)}
						<li>
							{#if n === null}
								<span
									class="{itemClass} flex items-center border border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
									>…</span
								>
							{:else}
								<PaginationItem
									href={href(n)}
									active={n === state.page}
									aria-current={n === state.page ? 'page' : undefined}
									aria-label={m.list_page({ page: n })}
									class={[itemClass, 'border-gray-300 dark:border-gray-700']}
								>
									{n}
								</PaginationItem>
							{/if}
						</li>
					{/each}
					<li>
						{#if state.page < state.pageCount}
							<PaginationItem
								href={href(state.page + 1)}
								rel="next"
								class="{itemClass} rounded-e-lg"
								aria-label={m.list_next()}
							>
								<ChevronRightOutline class="size-4" aria-hidden="true" />
							</PaginationItem>
						{:else}
							<span
								class="{itemClass} flex items-center rounded-e-lg border border-gray-300 bg-white text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600"
								aria-hidden="true"
							>
								<ChevronRightOutline class="size-4" />
							</span>
						{/if}
					</li>
				</ul>
			</nav>
		{/if}
	</div>
{/if}
