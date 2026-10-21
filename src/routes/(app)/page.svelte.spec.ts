import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { DashboardMetrics } from '#lib/server/dashboard/index.ts';
import Dashboard from './+page.svelte';
import type { PageProps } from './$types';

const days = [
	'2026-10-15',
	'2026-10-16',
	'2026-10-17',
	'2026-10-18',
	'2026-10-19',
	'2026-10-20',
	'2026-10-21'
];
const flat = (values: number[], previousTotal = 0) => ({
	series: [{ key: 'total', values }],
	total: values.reduce((sum, value) => sum + value, 0),
	previousTotal
});

const metrics: DashboardMetrics = {
	period: 7,
	days,
	pendingUpdateRequests: 1074,
	activeBans: 2,
	unseenInfoReports: 6,
	registeredUsers: 1206,
	updateRequests: flat([0, 1, 0, 0, 0, 2, 0]),
	infoReports: flat([0, 0, 0, 3, 0, 0, 1]),
	bans: flat([0, 0, 0, 0, 0, 0, 0]),
	scoreReports: {
		series: [
			{ key: 'website', values: [0, 0, 0, 30, 0, 0, 2] },
			{ key: 'api_afpb_crawler', values: [0, 0, 0, 8, 0, 0, 0] },
			{ key: 'placard', values: [0, 0, 0, 0, 0, 0, 0] },
			{ key: 'admin', values: [0, 0, 0, 5, 0, 0, 0] },
			{ key: 'other', values: [0, 0, 0, 0, 0, 0, 0] }
		],
		total: 45,
		previousTotal: 30
	},
	mvpVotes: flat([0, 0, 0, 12, 3, 0, 0], 20),
	flashInterviews: flat([0, 0, 0, 3, 0, 0, 0]),
	newUsers: flat([1, 0, 2, 0, 0, 1, 0]),
	partnerClicks: flat([10, 20, 15, 46000, 30, 10, 7]),
	partners: [
		{ id: 3, name: 'SLC', clicks: 46092, allTime: 120000 },
		{ id: 9, name: 'Teste', clicks: 0, allTime: 0 }
	],
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
	it('shows every metric for the period with the locale digit grouping', async () => {
		renderDashboard(['dashboard']);

		await expect.element(page.getByText('Olá, Editor')).toBeInTheDocument();
		await expect.element(page.getByText('1074', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByText('1206', { exact: true })).toBeInTheDocument();
		// Clicks in the period: the card total and the partner's row.
		await expect.element(page.getByText('46 092', { exact: true }).nth(1)).toBeVisible();
		await expect.element(page.getByText('120 000 desde sempre')).toBeInTheDocument();
		await expect
			.element(page.getByRole('table', { name: 'Votos nos últimos 7 dias' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Alexandre Rodrigues')).toBeInTheDocument();
	});

	it('compares with the previous period and marks the chosen one', async () => {
		renderDashboard(['dashboard']);

		// 45 results vs 30; 15 votes vs 20.
		await expect.element(page.getByText('+50%')).toBeInTheDocument();
		await expect.element(page.getByText('-25%')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: '7 dias' }))
			.toHaveAttribute('aria-current', 'true');
		await expect
			.element(page.getByRole('link', { name: '30 dias' }))
			.toHaveAttribute('href', '/?days=30');
	});

	it('has a table with the daily numbers behind each chart', async () => {
		renderDashboard(['dashboard']);

		const table = page.getByRole('table', { name: 'Resultados enviados nos últimos 7 dias' });
		await expect.element(table).toBeInTheDocument();
		await expect
			.element(table.getByRole('columnheader', { name: 'Site da AFPB' }))
			.toBeInTheDocument();
		await expect.element(table.getByRole('cell', { name: '30', exact: true })).toBeInTheDocument();
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
		renderDashboard(['dashboard'], { partners: [], staff: [] });

		await expect.element(page.getByText('Nenhum parceiro disponível')).toBeInTheDocument();
		await expect.element(page.getByText('Nenhum utilizador com permissões')).toBeInTheDocument();
	});
});
