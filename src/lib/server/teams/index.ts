import { asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { Option } from '#lib/options.ts';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, players, teams } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	relevance,
	searchId
} from '#lib/server/list.ts';
import type { OptionsQuery } from '#lib/server/options.ts';

export type Team = typeof teams.$inferSelect;

export const TEAM_SORTS = ['id', 'name', 'club', 'updated_at'] as const;

/** Team name, club name or team id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(teams.name, pattern),
		like(clubs.name, pattern),
		id ? eq(teams.id, id) : undefined
	);
}

export async function listTeams(url: URL) {
	const params = parseListParams(url, TEAM_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);

	const [{ total }] = await db
		.select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(teams)
		.innerJoin(clubs, eq(clubs.id, teams.clubId))
		.where(where);
	const state = listState(params, total);

	const sortColumn = {
		id: teams.id,
		name: teams.name,
		club: clubs.name,
		updated_at: teams.updatedAt
	}[params.sort];

	const rows = await db
		.select({
			id: teams.id,
			name: teams.name,
			visible: teams.visible,
			updatedAt: teams.updatedAt,
			clubId: clubs.id,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(teams)
		.innerJoin(clubs, eq(clubs.id, teams.clubId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(teams.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({ ...row, clubEmblem: emblemUrl(row.clubEmblem) })),
		list: state
	};
}

export async function findTeam(id: number): Promise<Team | undefined> {
	const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
	return team;
}

/** What a delete removes with the team (foreign keys cascade). */
export async function teamUsage(id: number) {
	const [gameCount, playerCount] = await Promise.all([
		db.$count(games, or(eq(games.homeTeamId, id), eq(games.awayTeamId, id))),
		db.$count(players, eq(players.teamId, id))
	]);
	return { games: gameCount, players: playerCount };
}

export async function teamExists(id: number): Promise<boolean> {
	return (await db.$count(teams, eq(teams.id, id))) > 0;
}

type TeamOptionRow = { id: number; name: string; clubName: string; clubEmblem: string | null };

/** "Club · Team": team names repeat across clubs (Seniores, Veteranos, …). */
export function teamOption(team: TeamOptionRow): Option {
	return {
		value: team.id,
		label: `${team.clubName} · ${team.name}`,
		image: emblemUrl(team.clubEmblem)
	};
}

const teamOptionColumns = {
	id: teams.id,
	name: teams.name,
	clubName: clubs.name,
	clubEmblem: clubs.emblem
};

export async function findTeamOption(id: number | null | undefined): Promise<Option | null> {
	if (!id) return null;
	const [team] = await db
		.select(teamOptionColumns)
		.from(teams)
		.innerJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(teams.id, id))
		.limit(1);
	return team ? teamOption(team) : null;
}

/** Options of the team select: by club or team name, best club matches first, then by priority. */
export async function searchTeamOptions({ q, limit, offset }: OptionsQuery) {
	return db
		.select(teamOptionColumns)
		.from(teams)
		.innerJoin(clubs, eq(clubs.id, teams.clubId))
		.where(searchWhere(q))
		.orderBy(
			...(q ? [relevance(clubs.name, q)] : []),
			desc(clubs.priority),
			asc(clubs.name),
			asc(teams.name),
			asc(teams.id)
		)
		.limit(limit)
		.offset(offset);
}
