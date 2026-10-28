import { desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import { clubs, games, placardEvents, placards, teams, users } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';

/**
 * Stadium screens of domingoasdez-app (`/placard`). The app owns their state; the admin lists
 * them, shows what happened on each one and can release a screen back to its pairing code.
 */

export type Placard = typeof placards.$inferSelect;

export const PLACARD_SORTS = ['id', 'last_seen_at', 'last_action_at'] as const;

/** A screen that hasn't polled for this long is shown as offline (it polls every second). */
export const OFFLINE_AFTER_MS = 2 * 60 * 1000;

export const isOnline = (lastSeenAt: Date | null, now = new Date()) =>
	lastSeenAt !== null && now.getTime() - lastSeenAt.getTime() < OFFLINE_AFTER_MS;

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

/** The screen id (`#12` / `12`), a club of its game, or the controller's name. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const id = searchId(q);
	return or(
		like(homeClubs.name, pattern),
		like(awayClubs.name, pattern),
		like(users.name, pattern),
		id ? eq(placards.id, id) : undefined
	);
}

const selectRows = () =>
	db
		.select({
			id: placards.id,
			scene: placards.scene,
			pairingCode: placards.pairingCode,
			gameId: placards.gameId,
			gameDate: games.date,
			homeClub: homeClubs.name,
			homeEmblem: homeClubs.emblem,
			awayClub: awayClubs.name,
			awayEmblem: awayClubs.emblem,
			homeScore: placards.homeScore,
			awayScore: placards.awayScore,
			period: placards.period,
			controllerUserId: placards.controllerUserId,
			controllerName: users.name,
			version: placards.version,
			pairedAt: placards.pairedAt,
			lastActionAt: placards.lastActionAt,
			lastSeenAt: placards.lastSeenAt,
			createdAt: placards.createdAt
		})
		.from(placards)
		.leftJoin(games, eq(games.id, placards.gameId))
		.leftJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.leftJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.leftJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.leftJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.leftJoin(users, eq(users.id, placards.controllerUserId));

type Row = Awaited<ReturnType<ReturnType<typeof selectRows>['execute']>>[number];

const present = (row: Row, now: Date) => ({
	...row,
	homeEmblem: row.homeClub ? emblemUrl(row.homeEmblem) : null,
	awayEmblem: row.awayClub ? emblemUrl(row.awayEmblem) : null,
	online: isOnline(row.lastSeenAt, now)
});

export async function listPlacards(url: URL) {
	const params = parseListParams(url, PLACARD_SORTS, { sort: 'last_seen_at', dir: 'desc' });
	const where = searchWhere(params.q);
	const [{ total }] = await db
		.select({ total: sql<number>`count(*)`.mapWith(Number) })
		.from(placards)
		.leftJoin(games, eq(games.id, placards.gameId))
		.leftJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.leftJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.leftJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.leftJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.leftJoin(users, eq(users.id, placards.controllerUserId))
		.where(where);
	const state = listState(params, total);

	const sortColumn = {
		id: placards.id,
		last_seen_at: placards.lastSeenAt,
		last_action_at: placards.lastActionAt
	}[params.sort];

	const rows = await selectRows()
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(placards.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	const now = new Date();
	return { rows: rows.map((row) => present(row, now)), list: state };
}

export async function findPlacard(id: number) {
	const [row] = await selectRows().where(eq(placards.id, id)).limit(1);
	return row ? present(row, new Date()) : undefined;
}

/** The last events of a screen, newest first, with who did them. */
export async function placardEventRows(placardId: number, limit = 50) {
	return db
		.select({
			id: placardEvents.id,
			type: placardEvents.type,
			payload: placardEvents.payload,
			gameId: placardEvents.gameId,
			userId: placardEvents.userId,
			userName: users.name,
			createdAt: placardEvents.createdAt
		})
		.from(placardEvents)
		.leftJoin(users, eq(users.id, placardEvents.userId))
		.where(eq(placardEvents.placardId, placardId))
		.orderBy(desc(placardEvents.createdAt), desc(placardEvents.id))
		.limit(limit);
}

/**
 * Takes the screen off its game: back to `pairing` with a clean state. The code is cleared, so
 * the TV draws a new one on its next poll (within a second). Logged as a `release` event, like
 * the app's own "Terminar".
 */
export async function releasePlacard(id: number, userId: number) {
	const now = new Date();
	await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ gameId: placards.gameId })
			.from(placards)
			.where(eq(placards.id, id))
			.for('update');
		if (!row) return;
		await tx
			.update(placards)
			.set({
				scene: 'pairing',
				pairingCode: null,
				pairingCodeExpiresAt: null,
				gameId: null,
				controllerUserId: null,
				homeScore: 0,
				awayScore: 0,
				period: 'first_half',
				clockElapsedMs: 0,
				clockRunningSince: null,
				pairedAt: null,
				lastActionAt: now,
				version: sql`${placards.version} + 1`
			})
			.where(eq(placards.id, id));
		await tx.insert(placardEvents).values({
			placardId: id,
			gameId: row.gameId,
			userId,
			type: 'release',
			payload: { by: 'admin' },
			createdAt: now
		});
	});
}
