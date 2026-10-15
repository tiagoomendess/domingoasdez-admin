import { and, asc, desc, eq, isNotNull, isNull, like, lt, or, type SQL } from 'drizzle-orm';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	playerUpdateRequests,
	playerUpdateRequestStatuses,
	players,
	teams,
	users
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
import { isNoClub, suggestTeam, type PlayerValues, type RequestValues } from './compare';

export type UpdateRequest = typeof playerUpdateRequests.$inferSelect;
export type RequestStatus = (typeof playerUpdateRequestStatuses)[number];

export const REQUEST_SORTS = ['id', 'name', 'club', 'created_at'] as const;

/** `?status=`: pending by default, like the legacy list; `all` shows every request. */
export function parseStatusFilter(url: URL): RequestStatus | 'all' {
	const value = url.searchParams.get('status');
	if (value === 'all') return 'all';
	return (playerUpdateRequestStatuses as readonly string[]).includes(value ?? '')
		? (value as RequestStatus)
		: 'pending';
}

/** `?type=`: new players (`create`) or changes to existing ones (`update`). */
export function parseTypeFilter(url: URL): 'create' | 'update' | null {
	const value = url.searchParams.get('type');
	return value === 'create' || value === 'update' ? value : null;
}

/** Name, nickname, club, the request id (`#12` / `12`) or the player id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const text = or(
		like(playerUpdateRequests.name, pattern),
		like(playerUpdateRequests.nickname, pattern),
		like(playerUpdateRequests.clubName, pattern)
	);
	const id = searchId(q);
	return id
		? or(eq(playerUpdateRequests.id, id), eq(playerUpdateRequests.playerId, id), text)
		: text;
}

export async function listRequests(url: URL) {
	const params = parseListParams(url, REQUEST_SORTS, { sort: 'id', dir: 'desc' });
	const status = parseStatusFilter(url);
	const type = parseTypeFilter(url);
	const where = and(
		searchWhere(params.q),
		status === 'all' ? undefined : eq(playerUpdateRequests.status, status),
		type === 'create' ? isNull(playerUpdateRequests.playerId) : undefined,
		type === 'update' ? isNotNull(playerUpdateRequests.playerId) : undefined
	);
	const state = listState(params, await db.$count(playerUpdateRequests, where));

	const sortColumn = {
		id: playerUpdateRequests.id,
		name: playerUpdateRequests.name,
		club: playerUpdateRequests.clubName,
		created_at: playerUpdateRequests.createdAt
	}[params.sort];

	const rows = await db
		.select({
			id: playerUpdateRequests.id,
			playerId: playerUpdateRequests.playerId,
			name: playerUpdateRequests.name,
			nickname: playerUpdateRequests.nickname,
			clubName: playerUpdateRequests.clubName,
			team: playerUpdateRequests.team,
			hasPicture: isNotNull(playerUpdateRequests.pictureUrl),
			status: playerUpdateRequests.status,
			createdBy: playerUpdateRequests.createdBy,
			createdAt: playerUpdateRequests.createdAt,
			playerName: players.name,
			playerPicture: players.picture
		})
		.from(playerUpdateRequests)
		.leftJoin(players, eq(players.id, playerUpdateRequests.playerId))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(playerUpdateRequests.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		rows: rows.map((row) => ({
			...row,
			hasPicture: Boolean(row.hasPicture),
			playerPicture: profilePictureUrl(row.playerPicture)
		})),
		list: state,
		status,
		type
	};
}

export async function findRequest(id: number): Promise<UpdateRequest | undefined> {
	const [request] = await db
		.select()
		.from(playerUpdateRequests)
		.where(eq(playerUpdateRequests.id, id))
		.limit(1);
	return request;
}

export const pendingCount = () =>
	db.$count(playerUpdateRequests, eq(playerUpdateRequests.status, 'pending'));

/**
 * The pending request to review after `id`, in list order (newest first): the next older one,
 * else the newest. Null when none is left.
 */
export async function nextPendingId(id: number): Promise<number | null> {
	const pending = eq(playerUpdateRequests.status, 'pending');
	const [older] = await db
		.select({ id: playerUpdateRequests.id })
		.from(playerUpdateRequests)
		.where(and(pending, lt(playerUpdateRequests.id, id)))
		.orderBy(desc(playerUpdateRequests.id))
		.limit(1);
	if (older) return older.id;
	const [newest] = await db
		.select({ id: playerUpdateRequests.id })
		.from(playerUpdateRequests)
		.where(pending)
		.orderBy(desc(playerUpdateRequests.id))
		.limit(1);
	return newest && newest.id !== id ? newest.id : null;
}

export const requestValues = (request: UpdateRequest): RequestValues => ({
	playerId: request.playerId,
	name: request.name,
	nickname: request.nickname,
	pictureUrl: request.pictureUrl,
	associationId: request.associationId,
	phone: request.phone,
	email: request.email,
	facebookProfile: request.facebookProfile,
	birthDate: request.birthDate,
	position: request.position,
	obs: request.obs,
	clubName: request.clubName
});

/** The player a request changes, with the club and team the comparison needs. */
export async function requestPlayer(playerId: number | null) {
	if (!playerId) return null;
	const [row] = await db
		.select({
			player: players,
			teamName: teams.name,
			clubName: clubs.name,
			clubEmblem: clubs.emblem
		})
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(players.id, playerId))
		.limit(1);
	if (!row) return null;
	const values: PlayerValues = {
		name: row.player.name,
		nickname: row.player.nickname,
		picture: row.player.picture,
		associationId: row.player.associationId,
		phone: row.player.phone,
		email: row.player.email,
		facebookProfile: row.player.facebookProfile,
		birthDate: row.player.birthDate,
		position: row.player.position,
		teamId: row.player.teamId,
		clubName: row.clubName
	};
	return {
		row: row.player,
		values,
		teamName: row.teamName,
		clubEmblem: row.clubName ? emblemUrl(row.clubEmblem) : null
	};
}

export type ClubTarget =
	/** `no_club` / `none`: the player leaves their team. */
	| { kind: 'none' }
	/** A club of that name: the admin picks one of its visible teams. */
	| {
			kind: 'club';
			club: { id: number; name: string; emblem: string };
			teams: { id: number; name: string }[];
			/** Preselected: the legacy suggestion, or the only team. */
			suggestedTeamId: number | null;
	  }
	/** No club has that name (or it has no visible team): the admin picks any team. */
	| { kind: 'unknown'; clubName: string };

/**
 * Legacy club lookup: the club by exact name and its visible teams, with the team suggested
 * from the federation's squad name (`team`).
 */
export async function clubTarget(clubName: string, squad: string | null): Promise<ClubTarget> {
	if (isNoClub(clubName)) return { kind: 'none' };
	const [club] = await db
		.select({ id: clubs.id, name: clubs.name, emblem: clubs.emblem })
		.from(clubs)
		.where(eq(clubs.name, clubName))
		.limit(1);
	if (!club) return { kind: 'unknown', clubName };
	const clubTeams = await db
		.select({ id: teams.id, name: teams.name })
		.from(teams)
		.where(and(eq(teams.clubId, club.id), eq(teams.visible, true)))
		.orderBy(asc(teams.name), asc(teams.id));
	if (!clubTeams.length) return { kind: 'unknown', clubName };
	const suggested = clubTeams.length === 1 ? clubTeams[0] : suggestTeam(squad, clubTeams);
	return {
		kind: 'club',
		club: { ...club, emblem: emblemUrl(club.emblem) },
		teams: clubTeams,
		suggestedTeamId: suggested?.id ?? null
	};
}

/** Players that may already be the one a "new player" request describes. */
export async function possibleDuplicates(request: UpdateRequest) {
	const matches = [
		request.name ? eq(players.name, request.name) : undefined,
		request.associationId ? eq(players.associationId, request.associationId) : undefined
	].filter(Boolean);
	if (request.playerId || !matches.length) return [];
	const rows = await db
		.select({
			id: players.id,
			name: players.name,
			picture: players.picture,
			birthDate: players.birthDate,
			clubName: clubs.name
		})
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(or(...matches))
		.limit(5);
	return rows.map((row) => ({
		...row,
		picture: profilePictureUrl(row.picture),
		birthDate: row.birthDate?.slice(0, 10) ?? null
	}));
}

export async function reviewerName(userId: number | null): Promise<string | null> {
	if (!userId) return null;
	const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
	return user?.name ?? null;
}
