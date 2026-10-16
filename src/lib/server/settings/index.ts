import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { variables } from '#lib/server/db/schema.ts';
import { isUsedByCode, missingVariables, SOCIAL_MEDIA_PREFIX, variableKind } from './form';

export type VariableRow = typeof variables.$inferSelect;

/** What the browser may see of a row: secrets stay on the server. */
export function variableView(row: VariableRow) {
	const kind = variableKind(row.name);
	return {
		name: row.name,
		kind,
		value: kind === 'secret' ? null : row.value,
		usedByCode: isUsedByCode(row.name),
		updatedAt: row.updatedAt
	};
}

export type VariableView = ReturnType<typeof variableView>;

/** A handful of rows: no paging. Grouped by the part before the first dot. */
export async function listVariables(q: string) {
	const rows = await db.select().from(variables).orderBy(asc(variables.name));
	const search = q.trim().toLowerCase();
	const shown = rows
		.map(variableView)
		.filter(
			(row) =>
				!search || row.name.includes(search) || (row.value ?? '').toLowerCase().includes(search)
		);
	return {
		general: shown.filter((row) => !row.name.startsWith(SOCIAL_MEDIA_PREFIX)),
		socialMedia: shown.filter((row) => row.name.startsWith(SOCIAL_MEDIA_PREFIX)),
		missing: missingVariables(rows.map((row) => row.name))
	};
}

export async function findVariable(name: string): Promise<VariableRow | undefined> {
	const [row] = await db.select().from(variables).where(eq(variables.name, name)).limit(1);
	return row;
}
