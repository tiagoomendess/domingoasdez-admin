import { count, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { partnerClicks, partners } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { mediaUrl } from '#lib/server/media.ts';

export type Partner = typeof partners.$inferSelect;

export const PARTNER_SORTS = ['id', 'name', 'priority', 'clicks', 'created_at'] as const;

/**
 * All-time ad clicks per partner, as a derived table to join. `partner_clicks` has no
 * `partner_id` index, so it is grouped in one scan instead of counted per partner.
 */
export function clickTotals() {
	return db
		.select({ partnerId: partnerClicks.partnerId, total: count().as('total') })
		.from(partnerClicks)
		.groupBy(partnerClicks.partnerId)
		.as('partner_click_totals');
}

/** Partner name, or its id (`#12` / `12`). */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const byName = like(partners.name, containsPattern(q));
	const id = searchId(q);
	return id ? or(eq(partners.id, id), byName) : byName;
}

export async function listPartners(url: URL) {
	const params = parseListParams(url, PARTNER_SORTS, { sort: 'id', dir: 'desc' });
	const where = searchWhere(params.q);
	const state = listState(params, await db.$count(partners, where));

	const totals = clickTotals();
	const clicks = sql<number>`coalesce(${totals.total}, 0)`.mapWith(Number);
	const sortColumn = {
		id: partners.id,
		name: partners.name,
		priority: partners.priority,
		clicks,
		created_at: partners.createdAt
	}[params.sort];

	const rows = await db
		.select({
			id: partners.id,
			name: partners.name,
			url: partners.url,
			picture: partners.picture,
			priority: partners.priority,
			visible: partners.visible,
			clicks,
			createdAt: partners.createdAt
		})
		.from(partners)
		.leftJoin(totals, eq(totals.partnerId, partners.id))
		.where(where)
		.orderBy(orderBy(sortColumn, state.dir), orderBy(partners.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return { rows: rows.map((row) => ({ ...row, picture: mediaUrl(row.picture) })), list: state };
}

export async function findPartner(id: number): Promise<Partner | undefined> {
	const [partner] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
	return partner;
}

export async function partnerClickCount(id: number): Promise<number> {
	return db.$count(partnerClicks, eq(partnerClicks.partnerId, id));
}
