import { describe, expect, it } from 'vitest';
import { isRowReferencedError } from './errors';

describe('isRowReferencedError', () => {
	const mysqlError = Object.assign(new Error('Cannot delete or update a parent row'), {
		code: 'ER_ROW_IS_REFERENCED_2',
		errno: 1451
	});

	it('recognises the MySQL error, also when Drizzle wraps it', () => {
		expect(isRowReferencedError(mysqlError)).toBe(true);
		expect(isRowReferencedError(new Error('Failed query', { cause: mysqlError }))).toBe(true);
	});

	it('ignores other errors', () => {
		expect(isRowReferencedError(new Error('boom'))).toBe(false);
		expect(isRowReferencedError(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }))).toBe(
			false
		);
		expect(isRowReferencedError(null)).toBe(false);
	});
});
