import { requirePermission } from '#lib/server/auth/guard.ts';
import { listAgents } from '#lib/server/team-agents/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	requirePermission('team_agents');
	return listAgents(url);
};
