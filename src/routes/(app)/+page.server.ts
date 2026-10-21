import { can } from '#lib/auth/permissions.ts';
import { DEFAULT_DASHBOARD_PERIOD, parseDashboardPeriod } from '#lib/dashboard.ts';
import { requirePermission } from '#lib/server/auth/guard.ts';
import { loadDashboard } from '#lib/server/dashboard/index.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { PageServerLoad } from './$types';

/** The last chosen period, so the dashboard opens with it from the side nav. */
const PERIOD_COOKIE = 'dad_admin_dashboard_days';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const user = requirePermission('dashboard');

	const chosen = parseDashboardPeriod(url.searchParams.get('days'));
	if (chosen) {
		cookies.set(PERIOD_COOKIE, String(chosen), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}
	const period =
		chosen ?? parseDashboardPeriod(cookies.get(PERIOD_COOKIE)) ?? DEFAULT_DASHBOARD_PERIOD;

	return {
		metrics: await loadDashboard({
			isAdmin: can(user.permissions, 'admin'),
			period,
			timeZone: adminTimeZone(cookies)
		})
	};
};
