import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SideNav from './SideNav.svelte';

const user = {
	id: 1,
	name: 'Editor',
	email: 'editor@example.com',
	picture: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
	permissions: ['dashboard', 'articles', 'games']
};

describe('SideNav.svelte', () => {
	it('lists only the groups the user can access, with the current section open', async () => {
		render(SideNav, {
			user,
			pathname: '/games',
			backgroundImage: null,
			open: true,
			onClose: () => {}
		});

		await expect.element(page.getByText('editor@example.com')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Conteúdo' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Clubes' })).not.toBeInTheDocument();

		// The "Jogos" group contains the current page, so it starts expanded.
		await expect
			.element(page.getByRole('link', { name: 'Jogos' }))
			.toHaveAttribute('aria-current', 'page');
		await expect.element(page.getByRole('link', { name: 'Artigos' })).not.toBeInTheDocument();
	});

	it('expands a group on click', async () => {
		render(SideNav, { user, pathname: '/', backgroundImage: null, open: true, onClose: () => {} });

		const content = page.getByRole('button', { name: 'Conteúdo' });
		await expect.element(content).toHaveAttribute('aria-expanded', 'false');
		await content.click();
		await expect.element(content).toHaveAttribute('aria-expanded', 'true');
		await expect.element(page.getByRole('link', { name: 'Artigos' })).toBeInTheDocument();
	});
});
