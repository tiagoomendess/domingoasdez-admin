import type { RowDataPacket } from 'mysql2/promise';
import { db } from '#lib/server/db/index.ts';

/** MySQL lock names are limited to 64 characters. */
export const jobLockName = (job: string) => `dad:job:${job}`;

export type ReleaseLock = () => Promise<void>;

/**
 * Takes the job's MySQL named lock without waiting: null when another process holds it (a manual
 * `run` while the scheduler runs, the old process during a PM2 reload). The lock belongs to one
 * connection, which stays checked out until the release; MySQL frees it if the process dies.
 */
export async function acquireJobLock(job: string): Promise<ReleaseLock | null> {
	const name = jobLockName(job);
	const connection = await db.$client.getConnection();
	try {
		const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [
			name
		]);
		if (Number(rows[0]?.acquired) !== 1) {
			connection.release();
			return null;
		}
	} catch (error) {
		connection.destroy();
		throw error;
	}

	return async () => {
		try {
			await connection.query('SELECT RELEASE_LOCK(?)', [name]);
			connection.release();
		} catch (error) {
			// A broken connection already lost the lock: drop it instead of returning it to the pool.
			connection.destroy();
			throw error;
		}
	};
}
