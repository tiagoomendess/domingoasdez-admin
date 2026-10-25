import { and, asc, count, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	clubs,
	goals,
	idempotencyRecords,
	players,
	playgrounds,
	socialMediaPosts,
	teams
} from '#lib/server/db/schema.ts';
import type { JobContext } from '../job.ts';
import type { Logger } from '#lib/server/logger.ts';
import { renderMilestonePost, renderMilestoneStory } from '../images/goal-milestone.ts';
import { DEFAULT_EMBLEM, loadImage, placeholder } from '../images/sources.ts';
import { fileDay, imagePosts, storeTmpImage, type PlannedPost } from '../social/posts.ts';
import { siteTimeToday } from '../time.ts';
import {
	ageSafePicture,
	displayName,
	firstAndLastName,
	milestoneKey,
	milestonePostText,
	reachedMilestone
} from './player-goal-milestones.rules.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

async function optionalImage(path: string | null, log: Logger, what: string) {
	if (!path) return null;
	try {
		return await loadImage(path);
	} catch (error) {
		log.warn(`could not load the ${what} (${path})`, error);
		return null;
	}
}

/** The player with their team's club (legacy `getClub()`) and its first playground. */
async function findPlayer(id: number) {
	const [player] = await db
		.select({
			id: players.id,
			name: players.name,
			nickname: players.nickname,
			picture: players.picture,
			birthDate: players.birthDate,
			clubId: clubs.id,
			club: clubs.name,
			emblem: clubs.emblem
		})
		.from(players)
		.leftJoin(teams, eq(teams.id, players.teamId))
		.leftJoin(clubs, eq(clubs.id, teams.clubId))
		.where(eq(players.id, id))
		.limit(1);
	if (!player) return null;
	let background = placeholder('16_9', player.id);
	if (player.clubId !== null) {
		const [playground] = await db
			.select({ id: playgrounds.id, picture: playgrounds.picture })
			.from(playgrounds)
			.where(eq(playgrounds.clubId, player.clubId))
			.orderBy(asc(playgrounds.id))
			.limit(1);
		if (playground) background = playground.picture || placeholder('16_9', playground.id);
	}
	return { ...player, background };
}

/**
 * Legacy `PlayerGoalMilestones` (daily, 05:00 UTC): players who scored in the last 24 hours and
 * whose total is at (or up to 3 past) a milestone (50, 75, 100, …) get a story and a post at
 * 19:00 Lisbon, once per milestone (`idempotency_records`). As in legacy, the milestone is
 * recorded even when an image failed, so it is never posted twice.
 */
export async function run({ log, signal }: JobContext) {
	const now = new Date();
	// In the order of their first recent goal, as legacy's `pluck('player_id')->unique()`.
	const scorers = await db
		.select({ playerId: goals.playerId })
		.from(goals)
		.where(and(gte(goals.createdAt, new Date(now.getTime() - DAY_MS)), isNotNull(goals.playerId)))
		.groupBy(goals.playerId)
		.orderBy(sql`min(${goals.id})`);

	for (const { playerId } of scorers) {
		if (signal.aborted) return;
		const player = await findPlayer(playerId!);
		if (!player) {
			log.warn(`player #${playerId} not found`);
			continue;
		}
		const [{ total }] = await db
			.select({ total: count() })
			.from(goals)
			.where(eq(goals.playerId, player.id));
		const milestone = reachedMilestone(total);
		if (milestone === null) continue;

		const key = milestoneKey(player.id, milestone);
		const [done] = await db
			.select({ key: idempotencyRecords.key })
			.from(idempotencyRecords)
			.where(eq(idempotencyRecords.key, key))
			.limit(1);
		if (done) continue;

		const playerLog = log.child(`player #${player.id}`);
		const [background, picture, emblem] = await Promise.all([
			optionalImage(player.background, playerLog, 'background'),
			optionalImage(ageSafePicture(player, now), playerLog, 'picture'),
			player.clubId === null
				? null
				: optionalImage(player.emblem || DEFAULT_EMBLEM, playerLog, 'emblem')
		]);
		const input = { background, picture, emblem, name: firstAndLastName(player.name), milestone };
		const publishAt = siteTimeToday(now, '19:00');
		const name = `${player.id}_${milestone}_${fileDay(now)}.jpg`;

		const posts: PlannedPost[] = [];
		try {
			const url = await storeTmpImage(
				`goal_milestone_story_${name}`,
				await renderMilestoneStory(input)
			);
			posts.push(...imagePosts('story', url, publishAt));
		} catch (error) {
			playerLog.error('could not make the milestone story', error);
		}
		try {
			const url = await storeTmpImage(
				`goal_milestone_post_${name}`,
				await renderMilestonePost(input)
			);
			const text = milestonePostText(
				displayName(player.name, player.nickname),
				player.club,
				milestone
			);
			posts.push(...imagePosts('post', url, publishAt, text));
		} catch (error) {
			playerLog.error('could not make the milestone post', error);
		}

		await db.transaction(async (tx) => {
			if (posts.length) await tx.insert(socialMediaPosts).values(posts);
			await tx.insert(idempotencyRecords).values({ key, createdAt: now }).onDuplicateKeyUpdate({
				set: { key }
			});
		});
		log.info(
			`${displayName(player.name, player.nickname)}: ${milestone} goals (${total}), ${posts.length} post(s)`
		);
	}
}
