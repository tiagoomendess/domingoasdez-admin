import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

/** Liveness + database check for uptime monitors and deploy scripts. Public, no data exposed. */
export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`SELECT 1`);
		return json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
	} catch {
		return json({ status: 'error' }, { status: 503, headers: { 'cache-control': 'no-store' } });
	}
};
