import { describe, expect, it } from 'vitest';
import { changedFields, diffValues, entityPath, MASK, parseValues } from './diff';

describe('parseValues', () => {
	it('reads stored JSON objects', () => {
		expect(parseValues('{\n    "id": 1\n}')).toEqual({ values: { id: 1 }, raw: null });
	});

	it('keeps text that is not a JSON object', () => {
		expect(parseValues('{"body": "cut...')).toEqual({ values: null, raw: '{"body": "cut...' });
		expect(parseValues('null')).toEqual({ values: null, raw: 'null' });
		expect(parseValues(null)).toEqual({ values: null, raw: null });
		expect(parseValues('  ')).toEqual({ values: null, raw: null });
	});
});

describe('diffValues', () => {
	it('marks changed fields and keeps the rest', () => {
		expect(diffValues({ id: 1, name: 'A', tags: [1] }, { id: 1, name: 'B', tags: [1] })).toEqual([
			{ key: 'id', before: '1', after: '1', changed: false },
			{ key: 'name', before: 'A', after: 'B', changed: true },
			{ key: 'tags', before: '[\n  1\n]', after: '[\n  1\n]', changed: false }
		]);
	});

	it('lists fields only one side has', () => {
		expect(diffValues({ old: 1 }, { added: null })).toEqual([
			{ key: 'added', before: undefined, after: null, changed: true },
			{ key: 'old', before: '1', after: undefined, changed: true }
		]);
	});

	it('shows every field of a create or delete as changed', () => {
		expect(diffValues(null, { id: 2 })).toEqual([
			{ key: 'id', before: undefined, after: '2', changed: true }
		]);
	});

	it('masks secrets but still sees them change', () => {
		expect(diffValues({ password: 'a' }, { password: 'b' })).toEqual([
			{ key: 'password', before: MASK, after: MASK, changed: true }
		]);
		expect(diffValues({ password: null }, { password: null })[0].after).toBeNull();
	});
});

describe('changedFields', () => {
	it('names what an update changed, without timestamps', () => {
		const before = JSON.stringify({ id: 1, status: 'sent', updated_at: 'x' });
		const after = JSON.stringify({ id: 1, status: 'seen', updated_at: 'y' });
		expect(changedFields(before, after)).toEqual(['status']);
	});

	it('is empty without both sides', () => {
		expect(changedFields(null, '{"id":1}')).toEqual([]);
		expect(changedFields('{"id":1', '{"id":2}')).toEqual([]);
	});
});

describe('entityPath', () => {
	it('links ported sections', () => {
		expect(entityPath('Player', 12, 'update')).toBe('/players/12');
		expect(entityPath('GroupRules', 3, 'create')).toBe('/group-rules/3');
	});

	it('skips deleted rows, unknown models and rows without an id', () => {
		expect(entityPath('Player', 12, 'delete')).toBeNull();
		expect(entityPath('MatchImage', 5, 'create')).toBeNull();
		expect(entityPath('User', null, 'login')).toBeNull();
	});
});
