/** MySQL error codes the admin turns into messages instead of a 500 page. */
const ROW_IS_REFERENCED = new Set(['ER_ROW_IS_REFERENCED', 'ER_ROW_IS_REFERENCED_2']);

function mysqlCode(error: unknown): string | null {
	// Drizzle wraps driver errors (`DrizzleQueryError`) and keeps the mysql2 error as `cause`.
	for (let current = error, depth = 0; current && depth < 3; depth++) {
		if (typeof current !== 'object') return null;
		const code = (current as { code?: unknown }).code;
		if (typeof code === 'string' && code.startsWith('ER_')) return code;
		current = (current as { cause?: unknown }).cause;
	}
	return null;
}

/** A delete blocked by a foreign key without ON DELETE CASCADE (the row is still in use). */
export function isRowReferencedError(error: unknown): boolean {
	const code = mysqlCode(error);
	return code !== null && ROW_IS_REFERENCED.has(code);
}
