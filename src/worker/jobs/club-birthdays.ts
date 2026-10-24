import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { clubs, playgrounds, socialMediaPosts } from '#lib/server/db/schema.ts';
import type { JobContext } from '../job.ts';
import type { Logger } from '../log.ts';
import { renderBirthdayPost, renderBirthdayStory } from '../images/club-birthday.ts';
import { DEFAULT_EMBLEM, loadImage, placeholder } from '../images/sources.ts';
import { fileDay, imagePosts, storeTmpImage, type PlannedPost } from '../social/posts.ts';
import { siteDay, siteTimeToday } from '../time.ts';
import { birthdayAge, birthdayPostText } from './club-birthdays.rules.ts';

/** Legacy `Club::getFirstPlayground()` (lowest id) `->getPicture()`, or null without one. */
async function firstPlaygroundPicture(clubId: number): Promise<string | null> {
	const [playground] = await db
		.select({ id: playgrounds.id, picture: playgrounds.picture })
		.from(playgrounds)
		.where(eq(playgrounds.clubId, clubId))
		.orderBy(asc(playgrounds.id))
		.limit(1);
	if (!playground) return null;
	return playground.picture || placeholder('16_9', playground.id);
}

/** An image the drawing can do without: legacy logged a warning and drew the rest. */
async function optionalImage(path: string | null, log: Logger, what: string) {
	if (!path) return null;
	try {
		return await loadImage(path);
	} catch (error) {
		log.warn(`could not load the ${what} (${path})`, error);
		return null;
	}
}

/**
 * Legacy `ClubBirthdays` (daily, 03:00 UTC): clubs founded on this day (with birthday posts on)
 * get a story at 07:00 and a post at 07:05 (Lisbon), on Facebook and Instagram, with their name,
 * emblem and age over their first playground's picture.
 */
export async function run({ log, signal }: JobContext) {
	const now = new Date();
	const today = siteDay(now);
	const [, month, day] = today.split('-').map(Number);
	const birthdays = await db
		.select({
			id: clubs.id,
			name: clubs.name,
			emblem: clubs.emblem,
			foundingDate: clubs.foundingDate
		})
		.from(clubs)
		.where(
			and(
				isNotNull(clubs.foundingDate),
				eq(clubs.birthdayPostEnabled, true),
				sql`month(${clubs.foundingDate}) = ${month}`,
				sql`day(${clubs.foundingDate}) = ${day}`
			)
		)
		.orderBy(asc(clubs.id));

	for (const club of birthdays) {
		if (signal.aborted) return;
		const age = birthdayAge(club.foundingDate!, today);
		if (age === null) continue;
		const clubLog = log.child(`club #${club.id}`);
		const background = await optionalImage(
			await firstPlaygroundPicture(club.id),
			clubLog,
			'playground picture'
		);
		const emblem = await optionalImage(club.emblem || DEFAULT_EMBLEM, clubLog, 'emblem');
		const input = { background, emblem, club: club.name, age };

		const posts: PlannedPost[] = [];
		try {
			const url = await storeTmpImage(
				`birthday_story_${club.id}_${fileDay(now)}.jpg`,
				await renderBirthdayStory(input)
			);
			posts.push(...imagePosts('story', url, siteTimeToday(now, '07:00')));
		} catch (error) {
			clubLog.error('could not make the birthday story', error);
		}
		try {
			const url = await storeTmpImage(
				`birthday_post_${club.id}_${fileDay(now)}.jpg`,
				await renderBirthdayPost(input)
			);
			posts.push(
				...imagePosts('post', url, siteTimeToday(now, '07:05'), birthdayPostText(club.name, age))
			);
		} catch (error) {
			clubLog.error('could not make the birthday post', error);
		}
		if (posts.length) await db.insert(socialMediaPosts).values(posts);
		log.info(`${club.name} turns ${age}: ${posts.length} post(s) scheduled`);
	}
}
