import { eq } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { canEditAnyScore, canEditGameScore, type AccessUser } from '#lib/auth/access.ts';
import { m } from '#lib/paraglide/messages.js';
import { audit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db/index.ts';
import { games, scoreReports } from '#lib/server/db/schema.ts';
import { invalid, parseForm } from '#lib/server/forms.ts';
import { changedColumns } from '#lib/server/db/changes.ts';
import { banFakeReporter } from '#lib/server/score-report-bans/save.ts';
import { scoreFormSchema, statusFlags, type ReportStatus } from './form';
import { findScoreGame, gameMatchName } from './index';

/** Where the game must be for a club admin: today (or yesterday evening) only. */
const CLUB_ADMIN_WINDOW_MS = 36 * 60 * 60 * 1000;

function requestInfo() {
	const event = getRequestEvent();
	let ip: string | null = null;
	try {
		ip = event.getClientAddress();
	} catch {
		// No address (e.g. in tests).
	}
	return {
		ipAddress: (ip ?? 'Unknown').slice(0, 45),
		ipCountry: event.request.headers.get('cf-ipcountry')?.slice(0, 155) ?? null,
		userAgent: (event.request.headers.get('user-agent') ?? 'Unknown').slice(0, 255)
	};
}

/**
 * Legacy `GamesController@todayUpdateScore`: when the score or "finished" changes, a score
 * report (source `admin`) records who sent it, then the game is updated and audited.
 */
export async function saveScore(formData: FormData, user: AccessUser & { id: number }) {
	const form = parseForm(scoreFormSchema, formData);
	if (!form.success) return { failure: invalid(form.errors, form.values) };
	const data = form.data;

	const found = await findScoreGame(data.game_id);
	if (!found || !canEditGameScore(user, found)) {
		return { failure: invalid({}, form.values, m.today_not_allowed()) };
	}
	const game = found.game;
	// Club admins edit the day's results, not the history of their games.
	if (!canEditAnyScore(user) && Math.abs(Date.now() - game.date.getTime()) > CLUB_ADMIN_WINDOW_MS) {
		return { failure: invalid({}, form.values, m.today_not_allowed()) };
	}

	const changed =
		game.goalsHome !== data.goals_home ||
		game.goalsAway !== data.goals_away ||
		Boolean(game.finished) !== data.finished;
	if (!changed) return { game };

	await db.insert(scoreReports).values({
		gameId: game.id,
		homeScore: data.goals_home,
		awayScore: data.goals_away,
		source: 'admin',
		...requestInfo(),
		finished: data.finished,
		// Legacy read the public site's `uuid` cookie, which this domain doesn't see.
		uuid: crypto.randomUUID(),
		userId: user.id
	});
	await db
		.update(games)
		.set({ goalsHome: data.goals_home, goalsAway: data.goals_away, finished: data.finished })
		.where(eq(games.id, game.id));
	const [updated] = await db.select().from(games).where(eq(games.id, game.id));
	await audit({ action: 'update', model: 'Game', oldValues: game, newValues: updated });
	return { game: updated };
}

/**
 * Mark a report correct or fake by hand (legacy `GamesController@updateIsFake`): the automatic
 * check only catches scores above the final result. Like legacy, marking a website report fake
 * bans its sender right away (15 days), unless an active ban already covers them.
 */
export async function setReportStatus(id: number, status: ReportStatus) {
	const [report] = await db.select().from(scoreReports).where(eq(scoreReports.id, id)).limit(1);
	if (!report) return null;
	const changes = changedColumns(report, statusFlags(status));
	if (Object.keys(changes).length) {
		await db.update(scoreReports).set(changes).where(eq(scoreReports.id, id));
		const [updated] = await db.select().from(scoreReports).where(eq(scoreReports.id, id));
		await audit({ action: 'update', model: 'ScoreReport', oldValues: report, newValues: updated });
	}
	const ban =
		status === 'fake' && report.source === 'website'
			? await banFakeReporter(report, await gameMatchName(report.gameId))
			: null;
	return {
		...statusFlags(status),
		ban: ban && { id: ban.ban.id, created: ban.created, expiresAt: ban.ban.expiresAt }
	};
}
