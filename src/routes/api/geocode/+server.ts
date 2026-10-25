import { json } from '@sveltejs/kit';
import { requireAnyPermission } from '#lib/server/auth/guard.ts';
import { searchPlaces } from '#lib/server/geocode.ts';
import { logger } from '#lib/server/log.ts';
import type { RequestHandler } from './$types';

const log = logger.child('geocode');

/** Address search for the playground map (`?q=`), through Nominatim on the server. */
export const GET: RequestHandler = async ({ url }) => {
	requireAnyPermission(['playgrounds.create', 'playgrounds.edit']);
	const q = (url.searchParams.get('q') ?? '').slice(0, 200);
	try {
		return json({ places: await searchPlaces(q) });
	} catch (error) {
		log.warn('search failed', error);
		return json({ places: [], error: true }, { status: 502 });
	}
};
