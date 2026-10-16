/**
 * Address search for the playground map, through OpenStreetMap's Nominatim. Its usage policy
 * asks for an identifying User-Agent, at most one request per second and caching, so searches go
 * through the server, never the browser.
 */

export type Place = { label: string; lat: number; lng: number };

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'DomingoAsDezAdmin/1.0 (https://domingoasdez.com)';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const MIN_INTERVAL_MS = 1100;

const cache = new Map<string, { at: number; places: Place[] }>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

/** Runs `task` after the previous one, at least `MIN_INTERVAL_MS` after the last request. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
	const run = queue.then(async () => {
		const wait = lastRequest + MIN_INTERVAL_MS - Date.now();
		if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
		lastRequest = Date.now();
		return task();
	});
	queue = run.catch(() => undefined);
	return run;
}

type NominatimResult = { display_name?: string; lat?: string; lon?: string };

export function parsePlaces(body: unknown): Place[] {
	if (!Array.isArray(body)) return [];
	return (body as NominatimResult[])
		.map((row) => ({
			label: String(row.display_name ?? ''),
			lat: Number(row.lat),
			lng: Number(row.lon)
		}))
		.filter((place) => place.label && Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

/** Places matching `query` in Portugal (the competitions are local), best match first. */
export async function searchPlaces(query: string): Promise<Place[]> {
	const key = query.trim().toLowerCase();
	if (key.length < 3) return [];
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.places;

	const url = new URL(ENDPOINT);
	url.search = new URLSearchParams({
		q: query.trim(),
		format: 'jsonv2',
		countrycodes: 'pt',
		limit: '6',
		'accept-language': 'pt-PT'
	}).toString();

	const places = await throttled(async () => {
		const response = await fetch(url, {
			headers: { 'user-agent': USER_AGENT },
			signal: AbortSignal.timeout(8000)
		});
		if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
		return parsePlaces(await response.json());
	});

	if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
	cache.set(key, { at: Date.now(), places });
	return places;
}
