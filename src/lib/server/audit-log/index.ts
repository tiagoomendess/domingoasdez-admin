import { and, asc, eq, isNotNull, like, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { audit, users } from '#lib/server/db/schema.ts';
import {
	containsPattern,
	listState,
	orderBy,
	pageOffset,
	parseListParams,
	searchId
} from '#lib/server/list.ts';
import { changedFields, entityPath } from './diff';

export const AUDIT_SORTS = ['id'] as const;

/** Legacy `Audit::ACTIONS`. */
export const AUDIT_ACTIONS = [
	'create',
	'update',
	'delete',
	'view',
	'login',
	'login_failed',
	'logout',
	'register',
	'forgot_password',
	'other'
] as const;

/** Legacy showed 100 rows per page; the diff summary makes rows taller. */
const PAGE_SIZE = 50;

export type AuditFilters = {
	action: string | null;
	model: string | null;
	modelId: number | null;
	userId: number | null;
};

const positiveInt = (value: string | null) => {
	const n = Number(value);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export function parseAuditFilters(url: URL): AuditFilters {
	const action = url.searchParams.get('action');
	const model = url.searchParams.get('model')?.trim() || null;
	return {
		action: (AUDIT_ACTIONS as readonly string[]).includes(action ?? '') ? action : null,
		model: model && /^\w{1,50}$/.test(model) ? model : null,
		modelId: positiveInt(url.searchParams.get('model_id')),
		userId: positiveInt(url.searchParams.get('user'))
	};
}

const IP = /^[\d.]+$|^[\da-f:]+:[\da-f:]*$/i;

/** An id (the row or the audited entity), an exact IP address, or the extra info text. */
function searchWhere(q: string): SQL | undefined {
	if (!q) return undefined;
	const id = searchId(q);
	if (id) return or(eq(audit.id, id), eq(audit.modelId, id));
	if (IP.test(q)) return eq(audit.ipAddress, q);
	return like(audit.extraInfo, containsPattern(q));
}

function filtersWhere(filters: AuditFilters): SQL | undefined {
	return and(
		filters.action ? eq(audit.action, filters.action) : undefined,
		filters.model ? eq(audit.model, filters.model) : undefined,
		filters.modelId ? eq(audit.modelId, filters.modelId) : undefined,
		filters.userId ? eq(audit.userId, filters.userId) : undefined
	);
}

export async function listAudit(url: URL) {
	const params = parseListParams(url, AUDIT_SORTS, { sort: 'id', dir: 'desc' });
	const filters = parseAuditFilters(url);
	const where = and(searchWhere(params.q), filtersWhere(filters));
	const state = listState(params, await db.$count(audit, where), PAGE_SIZE);

	const rows = await db
		.select({
			id: audit.id,
			action: audit.action,
			model: audit.model,
			modelId: audit.modelId,
			oldValues: audit.oldValues,
			newValues: audit.newValues,
			ipAddress: audit.ipAddress,
			ipCountry: audit.ipCountry,
			extraInfo: audit.extraInfo,
			createdAt: audit.createdAt,
			userId: audit.userId,
			userName: users.name
		})
		.from(audit)
		.leftJoin(users, eq(users.id, audit.userId))
		.where(where)
		.orderBy(orderBy(audit.id, state.dir))
		.limit(state.pageSize)
		.offset(pageOffset(state));

	return {
		// The values can be large (article bodies): only the changed field names leave the server.
		rows: rows.map(({ oldValues, newValues, ...row }) => ({
			...row,
			changed: row.action === 'update' ? changedFields(oldValues, newValues) : [],
			entityPath: entityPath(row.model, row.modelId, row.action)
		})),
		list: state,
		filters
	};
}

/** Model names in the log, for the filter (the column is indexed). */
export async function auditModels(): Promise<string[]> {
	const rows = await db
		.selectDistinct({ model: audit.model })
		.from(audit)
		.where(isNotNull(audit.model))
		.orderBy(asc(audit.model));
	return rows.map((row) => row.model).filter((model): model is string => Boolean(model));
}

export async function findAuditEntry(id: number) {
	const [row] = await db
		.select({ entry: audit, userName: users.name, userEmail: users.email })
		.from(audit)
		.leftJoin(users, eq(users.id, audit.userId))
		.where(eq(audit.id, id))
		.limit(1);
	return row;
}
