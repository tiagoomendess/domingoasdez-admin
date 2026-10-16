import { and, asc, eq, like, or, type SQL } from 'drizzle-orm';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	teamAgents,
	teamAgentsHistory,
	teamAgentTypes,
	teams
} from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { profilePictureUrl } from '#lib/server/media.ts';

export type TeamAgent = typeof teamAgents.$inferSelect;
export type HistoryRow = typeof teamAgentsHistory.$inferSelect;
export type AgentType = (typeof teamAgentTypes)[number];

export const AGENT_SORTS = ['id', 'name', 'agent_type', 'club', 'created_at'] as const;

/** `?type=` filter of the list. */
export function parseTypeFilter(url: URL): AgentType | null {
	const value = url.searchParams.get('type');
	return (teamAgentTypes as readonly string[]).includes(value ?? '') ? (value as AgentType) : null;
}

/** Name, external id, or the id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const text = or(like(teamAgents.name, pattern), like(teamAgents.externalId, pattern));
	const id = searchId(q);
	return id ? or(eq(teamAgents.id, id), text) : text;
}

export async function listAgents(url: URL) {
	// Legacy list: newest first.
	const params = parseListParams(url, AGENT_SORTS, { sort: 'created_at', dir: 'desc' });
	const type = parseTypeFilter(url);
	const where = and(searchWhere(params.q), type ? eq(teamAgents.agentType, type) : undefined);
	const state = listState(params, await db.$count(teamAgents, where));

	const sortColumn = {
		id: teamAgents.id,
		name: teamAgents.name,
		agent_type: teamAgents.agentType,
		club: clubs.name,
		created_at: teamAgents.createdAt
	}[params.sort];

	const rows = await db
		.select({
			id: teamAgents.id,
			name: teamAgents.name,
			picture: teamAgents.picture,
			agentType: teamAgents.agentType,
			playerId: teamAgents.playerId,
			createdAt: teamAgents.createdAt,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(teamAgents)
		.leftJoin(teams, eq(teams.id, teamAgents.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(teamAgents.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({
			...row,
			picture: profilePictureUrl(row.picture),
			clubEmblem: row.clubName ? emblemUrl(row.clubEmblem) : null
		})),
		list: state,
		type
	};
}

export async function findAgent(id: number): Promise<TeamAgent | undefined> {
	const [agent] = await db.select().from(teamAgents).where(eq(teamAgents.id, id)).limit(1);
	return agent;
}

export async function findHistoryEntry(agentId: number, id: number) {
	const [row] = await db
		.select()
		.from(teamAgentsHistory)
		.where(and(eq(teamAgentsHistory.id, id), eq(teamAgentsHistory.teamAgentId, agentId)))
		.limit(1);
	return row;
}

/** The coach's whole history, oldest first (the rules read it in date order). */
export async function agentHistoryRows(agentId: number): Promise<HistoryRow[]> {
	return db
		.select()
		.from(teamAgentsHistory)
		.where(eq(teamAgentsHistory.teamAgentId, agentId))
		.orderBy(asc(teamAgentsHistory.startedAt), asc(teamAgentsHistory.id));
}

/** The history for the page, newest first (legacy order), with team and club names. */
export async function agentHistory(agentId: number) {
	const rows = await db
		.select({
			id: teamAgentsHistory.id,
			teamId: teamAgentsHistory.teamId,
			agentType: teamAgentsHistory.agentType,
			startedAt: teamAgentsHistory.startedAt,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(teamAgentsHistory)
		.leftJoin(teams, eq(teams.id, teamAgentsHistory.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(teamAgentsHistory.teamAgentId, agentId))
		.orderBy(asc(teamAgentsHistory.startedAt), asc(teamAgentsHistory.id));
	return rows.reverse().map((row) => ({
		...row,
		// Calendar day: started_at is a naive UTC datetime, usually midnight.
		startedOn: row.startedAt.toISOString().slice(0, 10),
		team: row.clubName
			? { label: `${row.clubName} · ${row.teamName}`, image: emblemUrl(row.clubEmblem) }
			: null
	}));
}
