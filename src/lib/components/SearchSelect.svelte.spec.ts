import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Option } from '#lib/options.ts';
import SearchSelect, { SEARCH_DEBOUNCE_MS } from './SearchSelect.svelte';

const CLUBS: Option[] = Array.from({ length: 45 }, (_, index) => ({
	value: index + 1,
	label: `Clube ${index + 1}`
}));

/** Fake `/api/options/clubs`: substring search, 20 per page. */
function optionsResponse(input: RequestInfo | URL) {
	const url = new URL(String(input), window.location.origin);
	const q = (url.searchParams.get('q') ?? '').toLowerCase();
	const pageNumber = Number(url.searchParams.get('page') ?? '1');
	const matches = CLUBS.filter((club) => club.label.toLowerCase().includes(q));
	return Response.json({
		items: matches.slice((pageNumber - 1) * 20, pageNumber * 20),
		hasMore: matches.length > pageNumber * 20
	});
}

let fetchMock: ReturnType<typeof vi.fn>;
const requests = () =>
	fetchMock.mock.calls.map(([input]) => new URL(String(input), window.location.origin));

beforeEach(() => {
	fetchMock = vi.fn(async (input: RequestInfo | URL) => optionsResponse(input));
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function setup(value: Option | null = null, extra: { noneLabel?: string } = {}) {
	const screen = render(SearchSelect, {
		name: 'club_id',
		endpoint: '/api/options/clubs',
		value,
		label: 'Clube',
		...extra
	});
	const hidden = () =>
		screen.container.querySelector<HTMLInputElement>('input[type="hidden"][name="club_id"]')!;
	return { screen, combobox: page.getByRole('combobox'), hidden };
}

describe('SearchSelect.svelte', () => {
	it('shows the option given by the page without any request', async () => {
		const { combobox, hidden } = setup({ value: 7, label: 'Clube 7' });

		await expect.element(combobox).toHaveValue('Clube 7');
		await expect.element(combobox).toHaveAttribute('aria-expanded', 'false');
		expect(hidden().value).toBe('7');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('lists options on click and marks the selected one', async () => {
		const { combobox } = setup({ value: 2, label: 'Clube 2' });

		await combobox.click();
		await expect.element(combobox).toHaveAttribute('aria-expanded', 'true');
		const listbox = page.getByRole('listbox', { name: 'Clube' });
		await expect.element(listbox).toBeVisible();
		await expect.element(combobox).toHaveAttribute('aria-controls', listbox.element().id);
		await expect
			.element(page.getByRole('option', { name: 'Clube 2', exact: true }))
			.toHaveAttribute('aria-selected', 'true');
		expect(page.getByRole('option').all()).toHaveLength(20);
		expect(requests()[0].searchParams.get('q')).toBeNull();
	});

	it('debounces typing into a single search', async () => {
		const { combobox } = setup();

		await combobox.click();
		await expect.poll(() => fetchMock.mock.calls.length).toBe(1);

		await userEvent.type(combobox, '12');
		await expect.poll(() => fetchMock.mock.calls.length).toBe(2);
		expect(requests()[1].searchParams.get('q')).toBe('12');

		// Nothing else is sent once the debounce has passed.
		await new Promise((done) => setTimeout(done, SEARCH_DEBOUNCE_MS + 100));
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await expect.element(page.getByRole('option', { name: 'Clube 12' })).toBeVisible();
	});

	it('aborts a request that a newer search replaces', async () => {
		const signals: AbortSignal[] = [];
		fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			signals.push(init!.signal!);
			if (signals.length > 1) return Promise.resolve(optionsResponse(input));
			// The first request never answers until it is aborted.
			return new Promise((_, reject) =>
				init!.signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
			);
		});
		const { combobox } = setup();

		await combobox.click();
		await userEvent.type(combobox, '3');
		await expect.poll(() => signals.length).toBe(2);
		expect(signals[0].aborted).toBe(true);
		expect(signals[1].aborted).toBe(false);
		await expect.element(page.getByRole('option', { name: 'Clube 3', exact: true })).toBeVisible();
	});

	it('is keyboard navigable and submits the chosen id', async () => {
		const { combobox, hidden } = setup();

		await combobox.click();
		await expect.element(page.getByRole('option', { name: 'Clube 1', exact: true })).toBeVisible();
		const first = page.getByRole('option', { name: 'Clube 1', exact: true }).element();
		await expect.element(combobox).toHaveAttribute('aria-activedescendant', first.id);

		await userEvent.keyboard('{ArrowDown}{ArrowDown}');
		const third = page.getByRole('option', { name: 'Clube 3', exact: true }).element();
		await expect.element(combobox).toHaveAttribute('aria-activedescendant', third.id);

		await userEvent.keyboard('{Enter}');
		await expect.element(combobox).toHaveAttribute('aria-expanded', 'false');
		await expect.element(combobox).toHaveValue('Clube 3');
		expect(hidden().value).toBe('3');
	});

	it('closes with Escape and restores the selected label', async () => {
		const { combobox, hidden } = setup({ value: 5, label: 'Clube 5' });

		await combobox.click();
		await userEvent.fill(combobox, 'xyz');
		await userEvent.keyboard('{Escape}');
		await expect.element(combobox).toHaveAttribute('aria-expanded', 'false');
		await expect.element(combobox).toHaveValue('Clube 5');
		expect(hidden().value).toBe('5');
	});

	it('loads the next page when the list is scrolled to the end', async () => {
		const { combobox } = setup();

		await combobox.click();
		await expect.poll(() => page.getByRole('option').all().length).toBe(20);

		const listbox = page.getByRole('listbox').element();
		listbox.scrollTop = listbox.scrollHeight;
		listbox.dispatchEvent(new Event('scroll'));

		await expect.poll(() => page.getByRole('option').all().length).toBe(40);
		expect(requests().at(-1)?.searchParams.get('page')).toBe('2');
	});

	it('clears an optional selection', async () => {
		const { hidden } = setup({ value: 9, label: 'Clube 9' });

		await page.getByRole('button', { name: /limpar|clear/i }).click();
		await expect.element(page.getByRole('combobox')).toHaveValue('');
		expect(hidden().value).toBe('');
	});

	it('Enter on emptied text clears the selection instead of picking the first option', async () => {
		const { combobox, hidden } = setup({ value: 9, label: 'Clube 9' });

		await combobox.click();
		await userEvent.clear(combobox);
		await expect.element(page.getByRole('option').first()).toBeVisible();
		await userEvent.keyboard('{Enter}');

		await expect.element(combobox).toHaveValue('');
		expect(hidden().value).toBe('');
	});

	it('Tab on emptied text clears the selection instead of restoring it', async () => {
		const { combobox, hidden } = setup({ value: 9, label: 'Clube 9' });

		await combobox.click();
		await userEvent.clear(combobox);
		await userEvent.keyboard('{Tab}');

		await expect.element(combobox).toHaveValue('');
		expect(hidden().value).toBe('');
	});

	it('lists a "none" choice first when given one', async () => {
		const { combobox, hidden } = setup({ value: 9, label: 'Clube 9' }, { noneLabel: 'Sem clube' });

		await combobox.click();
		await page.getByRole('button', { name: 'Sem clube' }).click();

		await expect.element(combobox).toHaveValue('');
		expect(hidden().value).toBe('');
	});
});
