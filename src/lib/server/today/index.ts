import { and, asc, count, desc, eq, gte, inArray, lt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { canEditAnyScore, canEditGameScore, type AccessUser } from '#lib/auth/access.ts';
import { emblemUrl } from '#lib/server/clubs/index.ts';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	competitions,
	gameGroups,
	games,
	goals,
	scoreReports,
	seasons,
	teams,
	users,
	uuidKarmas
} from '#lib/server/db/schema.ts';
import { mediaUrl } from '#lib/server/media.ts';
import { seasonLabel } from '#lib/seasons.ts';
import { accuracyLevel, groupByCompetition, reportedScores } from './form';

const homeTeams = alias(teams, 'home_teams');
const awayTeams = alias(teams, 'away_teams');
const homeClubs = alias(clubs, 'home_clubs');
const awayClubs = alias(clubs, 'away_clubs');

/** Legacy page read the latest 200 reports of the day's games. */
const REPORTS_LIMIT = 200;

const selectGames = () =>
	db
		.select({
			id: games.id,
			date: games.date,
			round: games.round,
			goalsHome: games.goalsHome,
			goalsAway: games.goalsAway,
			finished: games.finished,
			postponed: games.postponed,
			updatedAt: games.updatedAt,
			homeTeamId: games.homeTeamId,
			awayTeamId: games.awayTeamId,
			homeClubId: homeClubs.id,
			homeClub: homeClubs.name,
			homeEmblem: homeClubs.emblem,
			homeTeam: homeTeams.name,
			awayClubId: awayClubs.id,
			awayClub: awayClubs.name,
			awayEmblem: awayClubs.emblem,
			awayTeam: awayTeams.name,
			groupName: gameGroups.name,
			seasonName: seasons.name,
			startYear: seasons.startYear,
			endYear: seasons.endYear,
			competitionId: competitions.id,
			competitionName: competitions.name,
			competitionPicture: competitions.picture
		})
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.innerJoin(gameGroups, eq(gameGroups.id, games.gameGroupId))
		.innerJoin(seasons, eq(seasons.id, gameGroups.seasonId))
		.innerJoin(competitions, eq(competitions.id, seasons.competitionId));

/** Goals per game and team, for games without a typed score (legacy `getTotalHomeGoals`). */
async function goalCounts(gameIds: number[]) {
	if (!gameIds.length) return new Map<string, number>();
	const rows = await db
		.select({ gameId: goals.gameId, teamId: goals.teamId, total: count() })
		.from(goals)
		.where(inArray(goals.gameId, gameIds))
		.groupBy(goals.gameId, goals.teamId);
	return new Map(rows.map((row) => [`${row.gameId}:${row.teamId}`, row.total]));
}

async function latestReports(gameIds: number[]) {
	if (!gameIds.length) return new Map<number, { homeScore: number; awayScore: number }[]>();
	const rows = await db
		.select({
			gameId: scoreReports.gameId,
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore
		})
		.from(scoreReports)
		.where(inArray(scoreReports.gameId, gameIds))
		.orderBy(desc(scoreReports.id))
		.limit(REPORTS_LIMIT);
	const byGame = new Map<number, { homeScore: number; awayScore: number }[]>();
	for (const row of rows) byGame.set(row.gameId, [...(byGame.get(row.gameId) ?? []), row]);
	return byGame;
}

/**
 * The visible games of a day, by competition (highest priority first), each with its score
 * and the latest reported scores. Club admins only get their clubs' games.
 */
export async function dayGames(user: AccessUser, range: { start: Date; end: Date }) {
	const clubIds = [...user.clubIds];
	const rows = await selectGames()
		.where(
			and(
				gte(games.date, range.start),
				lt(games.date, range.end),
				eq(games.visible, true),
				canEditAnyScore(user)
					? undefined
					: or(inArray(homeClubs.id, clubIds), inArray(awayClubs.id, clubIds))
			)
		)
		.orderBy(
			desc(competitions.priority),
			asc(competitions.id),
			asc(games.date),
			asc(gameGroups.name),
			asc(games.id)
		);

	const ids = rows.map((row) => row.id);
	const [counts, reports] = await Promise.all([
		goalCounts(
			rows.filter((row) => row.goalsHome === null || row.goalsAway === null).map((row) => row.id)
		),
		latestReports(ids)
	]);

	const presented = rows.map((row) => ({
		id: row.id,
		date: row.date,
		round: row.round,
		finished: Boolean(row.finished),
		postponed: Boolean(row.postponed),
		updatedAt: row.updatedAt,
		goalsHome: row.goalsHome ?? counts.get(`${row.id}:${row.homeTeamId}`) ?? 0,
		goalsAway: row.goalsAway ?? counts.get(`${row.id}:${row.awayTeamId}`) ?? 0,
		home: { club: row.homeClub, team: row.homeTeam, emblem: emblemUrl(row.homeEmblem) },
		away: { club: row.awayClub, team: row.awayTeam, emblem: emblemUrl(row.awayEmblem) },
		group: `${seasonLabel({ name: row.seasonName, startYear: row.startYear, endYear: row.endYear })} · ${row.groupName}`,
		reported: reportedScores(reports.get(row.id) ?? []),
		canEdit: canEditGameScore(user, row),
		competitionId: row.competitionId,
		competitionName: row.competitionName,
		competitionPicture: row.competitionPicture ? mediaUrl(row.competitionPicture) : null
	}));
	return groupByCompetition(presented);
}

/** A game with its clubs, to check who may edit it. */
export async function findScoreGame(id: number) {
	const [row] = await db
		.select({
			game: games,
			homeClubId: homeClubs.id,
			awayClubId: awayClubs.id
		})
		.from(games)
		.innerJoin(homeTeams, eq(homeTeams.id, games.homeTeamId))
		.innerJoin(homeClubs, eq(homeClubs.id, homeTeams.clubId))
		.innerJoin(awayTeams, eq(awayTeams.id, games.awayTeamId))
		.innerJoin(awayClubs, eq(awayClubs.id, awayTeams.clubId))
		.where(eq(games.id, id))
		.limit(1);
	return row;
}

/** Legacy "resultados enviados" page: the game's latest 200 reports. */
const DETAILS_LIMIT = 200;

/**
 * Every report sent for a game, newest first. `detailed` adds who sent it (user, IP, country,
 * browser, device id, location and the device's karma): only for `score_update`, like legacy.
 * Club admins see when, what and from which source.
 */
export async function gameReports(gameId: number, detailed: boolean) {
	const rows = await db
		.select({
			id: scoreReports.id,
			createdAt: scoreReports.createdAt,
			homeScore: scoreReports.homeScore,
			awayScore: scoreReports.awayScore,
			finished: scoreReports.finished,
			source: scoreReports.source,
			isFake: scoreReports.isFake,
			isCorrect: scoreReports.isCorrect,
			userId: scoreReports.userId,
			userName: users.name,
			ipAddress: scoreReports.ipAddress,
			ipCountry: scoreReports.ipCountry,
			userAgent: scoreReports.userAgent,
			uuid: scoreReports.uuid,
			location: scoreReports.location,
			accuracy: scoreReports.locationAccuracy,
			karma: uuidKarmas.karma
		})
		.from(scoreReports)
		.leftJoin(users, eq(users.id, scoreReports.userId))
		.leftJoin(uuidKarmas, eq(uuidKarmas.uuid, scoreReports.uuid))
		.where(eq(scoreReports.gameId, gameId))
		.orderBy(desc(scoreReports.id))
		.limit(DETAILS_LIMIT);

	return rows.map((row) => {
		const base = {
			id: row.id,
			createdAt: row.createdAt,
			homeScore: row.homeScore,
			awayScore: row.awayScore,
			finished: Boolean(row.finished),
			source: row.source,
			isFake: Boolean(row.isFake),
			isCorrect: Boolean(row.isCorrect),
			signedIn: row.userId !== null,
			accuracy: row.location ? accuracyLevel(row.accuracy ?? null) : null
		};
		if (!detailed) return { ...base, details: null };
		return {
			...base,
			details: {
				userId: row.userId,
				userName: row.userName,
				ipAddress: row.ipAddress,
				ipCountry: row.ipCountry && row.ipCountry !== 'Unknown' ? row.ipCountry : null,
				userAgent: row.userAgent,
				uuid: row.uuid,
				location: row.location,
				accuracyMetres: row.location && row.accuracy !== null ? Math.round(row.accuracy) : null,
				karma: row.karma
			}
		};
	});
}

export type GameReport = Awaited<ReturnType<typeof gameReports>>[number];
