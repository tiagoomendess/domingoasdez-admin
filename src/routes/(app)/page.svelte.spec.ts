import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { DashboardMetrics } from '#lib/server/dashboard.ts';
import Dashboard from './+page.svelte';
import type { PageProps } from './$types';

const metrics: DashboardMetrics = {
	pendingUpdateRequests: 1074,
	activeBans: 2,
	unseenInfoReports: 6,
	partnerClicks: [
		{ id: 3, name: 'SLC', clicks: 46092 },
		{ id: 9, name: 'Teste', clicks: 0 }
	],
	mvpVotes24h: 15,
	scoreReports24h: 40,
	editedFlashInterviews48h: 3,
	registeredUsers: 1206,
	staff: [
		{ id: 742, name: 'Alexandre Rodrigues' },
		{ id: 283, name: 'Artur' }
	]
};

function renderDashboard(permissions: string[], overrides: Partial<DashboardMetrics> = {}) {
	const data = {
		user: { id: 1, name: 'Editor', email: 'editor@example.com', picture: '', permissions },
		sidenavImage: null,
		timezone: 'Europe/Lisbon',
		flash: null,
		metrics: { ...metrics, ...overrides }
	} as unknown as PageProps['data'];
	return render(Dashboard, { data } as PageProps);
}

describe('dashboard page', () => {
	it('shows every legacy metric with the locale digit grouping', async () => {
		renderDashboard(['dashboard']);

		await expect.element(page.getByText('Olá, Editor')).toBeInTheDocument();
		await expect.element(page.getByText('1074', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('1206', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('46\u00a0092', { exact: true })).toBeInTheDocument();
		await expect
			.element(page.getByText('Flash Interviews editadas nas últimas 48 horas'))
			.toBeInTheDocument();
		await expect.element(page.getByText('Alexandre Rodrigues')).toBeInTheDocument();
	});

	it('hides section links the admin cannot open', async () => {
		renderDashboard(['dashboard', 'info_reports']);

		await expect
			.element(page.getByRole('link', { name: 'Ver informações' }))
			.toHaveAttribute('href', '/info-reports');
		await expect.element(page.getByRole('link', { name: 'Ver pedidos' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'Ver todos' })).not.toBeInTheDocument();
		// Only admins get the staff names as links (legacy admin-only list).
		await expect.element(page.getByRole('link', { name: 'Artur' })).not.toBeInTheDocument();
	});

	it('links everything for admins', async () => {
		renderDashboard(['admin']);

		await expect
			.element(page.getByRole('link', { name: 'Ver pedidos' }))
			.toHaveAttribute('href', '/player-update-requests');
		await expect
			.element(page.getByRole('link', { name: 'Ver comentários' }))
			.toHaveAttribute('href', '/game-comments');
		await expect
			.element(page.getByRole('link', { name: 'Ver todos' }))
			.toHaveAttribute('href', '/users?has_permissions=1');
		await expect
			.element(page.getByRole('link', { name: 'Artur' }))
			.toHaveAttribute('href', '/users/283');
	});

	it('says when there are no partners or staff', async () => {
		renderDashboard(['dashboard'], { partnerClicks: [], staff: [] });

		await expect.element(page.getByText('Nenhum parceiro disponível')).toBeInTheDocument();
		await expect.element(page.getByText('Nenhum utilizador com permissões')).toBeInTheDocument();
	});
});
