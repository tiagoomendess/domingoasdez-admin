import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	articleComments,
	deleteRequests,
	socialProviders,
	userPermissions,
	userProfiles,
	users
} from '#lib/server/db/schema.ts';
import { deleteFile } from '#lib/server/storage/index.ts';
import type { JobContext } from '../job.ts';
import { sendMail } from '../mail/index.ts';
import { buildAccountDeletedEmail } from '../mail/messages.ts';
import {
	ANONYMOUS_PROFILE,
	ANONYMOUS_USER,
	requestAction
} from './process-delete-requests.rules.ts';

const markProcessed = (id: number) =>
	db.update(deleteRequests).set({ processed: true }).where(eq(deleteRequests.id, id));

/**
 * Legacy `ProcessDeleteRequest`: every confirmed account delete request anonymises the user
 * (comments emptied, permissions and social logins removed, profile and user fields cleared, the
 * profile picture deleted) after a last email. Fixes: unconfirmed requests are left pending
 * (legacy deleted them too), and a missing user or profile no longer stops the requests after it.
 */
export async function run({ log, signal, dryRun }: JobContext) {
	const pending = await db
		.select({
			id: deleteRequests.id,
			userId: deleteRequests.userId,
			cancelled: deleteRequests.cancelled,
			verified: deleteRequests.verified
		})
		.from(deleteRequests)
		.where(eq(deleteRequests.processed, false))
		.orderBy(asc(deleteRequests.id));

	const counts = { deleted: 0, cancelled: 0, waiting: 0 };
	for (const request of pending) {
		if (signal.aborted) break;
		const action = requestAction({
			cancelled: Boolean(request.cancelled),
			verified: Boolean(request.verified)
		});
		if (action === 'wait') {
			counts.waiting++;
			continue;
		}
		if (action === 'close') {
			await markProcessed(request.id);
			counts.cancelled++;
			log.info(`request ${request.id}: cancelled by user ${request.userId}, closed`);
			continue;
		}

		const [user] = await db
			.select({ name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, request.userId))
			.limit(1);
		if (!user) {
			log.warn(`request ${request.id}: user ${request.userId} not found, closed`);
			await markProcessed(request.id);
			continue;
		}

		// The last email goes first: the address is cleared below. A failed email doesn't stop the
		// deletion the user asked for.
		if (user.email) {
			try {
				await sendMail(buildAccountDeletedEmail({ to: user.email, name: user.name }), {
					dryRun,
					log
				});
			} catch (error) {
				log.error(`request ${request.id}: could not email user ${request.userId}`, error);
			}
		}

		const picture = await db.transaction(async (tx) => {
			const [profile] = await tx
				.select({ id: userProfiles.id, picture: userProfiles.picture })
				.from(userProfiles)
				.where(eq(userProfiles.userId, request.userId))
				.limit(1);
			await tx
				.update(articleComments)
				.set({ content: null })
				.where(eq(articleComments.userId, request.userId));
			await tx.delete(userPermissions).where(eq(userPermissions.userId, request.userId));
			if (profile) {
				await tx.update(userProfiles).set(ANONYMOUS_PROFILE).where(eq(userProfiles.id, profile.id));
			}
			await tx.update(users).set(ANONYMOUS_USER).where(eq(users.id, request.userId));
			await tx.delete(socialProviders).where(eq(socialProviders.userId, request.userId));
			await tx
				.update(deleteRequests)
				.set({ processed: true })
				.where(eq(deleteRequests.id, request.id));
			return profile?.picture ?? null;
		});
		// After the commit: never throws, ignores pictures that aren't uploads (social avatars).
		await deleteFile(picture);
		counts.deleted++;
		log.info(`request ${request.id}: account ${request.userId} deleted`);
	}

	if (pending.length) {
		log.info(
			`${counts.deleted} deleted, ${counts.cancelled} cancelled, ${counts.waiting} waiting for confirmation`
		);
	}
}
