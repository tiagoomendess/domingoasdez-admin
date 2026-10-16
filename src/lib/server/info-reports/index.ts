import { and, desc, eq, inArray, like, ne, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { infoReports, infoReportStatuses, users } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { OPEN_STATUSES, parseCode, type InfoReportStatus } from './form';

export type InfoReportRow = typeof infoReports.$inferSelect;

export const INFO_REPORT_SORTS = ['id', 'status', 'created_at'] as const;

/** `?status=`: open (sent + seen) by default, like the legacy list; `all` shows every report. */
export function parseStatusFilter(url: URL): InfoReportStatus | 'open' | 'all' {
	const value = url.searchParams.get('status');
	if (value === 'all') return 'all';
	return (infoReportStatuses as readonly string[]).includes(value ?? '')
		? (value as InfoReportStatus)
		: 'open';
}

/** Content, source, the code (legacy searched it exactly) or the id. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const pattern = containsPattern(q);
	const conditions = [like(infoReports.content, pattern), like(infoReports.source, pattern)];
	const code = parseCode(q);
	if (code) conditions.push(eq(infoReports.code, code));
	const id = searchId(q);
	if (id) conditions.push(eq(infoReports.id, id));
	return or(...conditions);
}

function statusWhere(status: ReturnType<typeof parseStatusFilter>): SQL | undefined {
	if (status === 'all') return undefined;
	if (status === 'open') return inArray(infoReports.status, [...OPEN_STATUSES]);
	return eq(infoReports.status, status);
}

export async function listInfoReports(url: URL) {
	// Legacy order: unread first (`status` is an ENUM, so it sorts sent, seen, …), newest first.
	const params = parseListParams(url, INFO_REPORT_SORTS, { sort: 'status', dir: 'asc' });
	const status = parseStatusFilter(url);
	const where = and(searchWhere(params.q), statusWhere(status));
	const state = listState(params, await db.$count(infoReports, where));

	const order =
		params.sort === 'status'
			? [orderBy(infoReports.status, state.dir), desc(infoReports.id)]
			: [orderBy(params.sort === 'id' ? infoReports.id : infoReports.createdAt, state.dir)];

	const rows = await db
		.select({
			id: infoReports.id,
			code: infoReports.code,
			status: infoReports.status,
			content: infoReports.content,
			source: infoReports.source,
			createdAt: infoReports.createdAt,
			userId: infoReports.userId,
			userName: users.name
		})
		.from(infoReports)
		.leftJoin(users, eq(users.id, infoReports.userId))
		.where(where)
		.orderBy(...order, orderBy(infoReports.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return { rows, list: state, status };
}

export async function findInfoReport(id: number): Promise<InfoReportRow | undefined> {
	const [row] = await db.select().from(infoReports).where(eq(infoReports.id, id)).limit(1);
	return row;
}

export async function reportAuthor(userId: number | null) {
	if (!userId) return null;
	const [user] = await db
		.select({ id: users.id, name: users.name, email: users.email })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	return user ?? null;
}

export const openReportCount = () =>
	db.$count(infoReports, inArray(infoReports.status, [...OPEN_STATUSES]));

/** The open report to handle after `id`, in the default list order (unread first, newest first). */
export async function nextOpenReportId(id: number): Promise<number | null> {
	const [next] = await db
		.select({ id: infoReports.id })
		.from(infoReports)
		.where(and(inArray(infoReports.status, [...OPEN_STATUSES]), ne(infoReports.id, id)))
		.orderBy(infoReports.status, desc(infoReports.id))
		.limit(1);
	return next?.id ?? null;
}
