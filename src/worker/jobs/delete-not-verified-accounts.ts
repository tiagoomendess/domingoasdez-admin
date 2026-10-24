import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import type { JobContext } from '../job.ts';

/** How long a new account has to confirm its email. */
export const VERIFY_WINDOW_MS = 15 * 60 * 1000;

export const unverifiedCutoff = (now: Date) => new Date(now.getTime() - VERIFY_WINDOW_MS);

/**
 * Legacy `DeleteNotVerifiedAccounts`: accounts still unverified 15 minutes after sign-up lose
 * their name, email, password and tokens, which frees the email for a new sign-up.
 */
export async function run({ log }: JobContext) {
	const [result] = await db
		.update(users)
		.set({ name: null, email: null, password: null, emailToken: null, rememberToken: null })
		.where(
			and(
				isNotNull(users.email),
				eq(users.verified, false),
				lt(users.createdAt, unverifiedCutoff(new Date()))
			)
		);
	if (result.affectedRows > 0) log.info(`blanked ${result.affectedRows} unverified account(s)`);
}
