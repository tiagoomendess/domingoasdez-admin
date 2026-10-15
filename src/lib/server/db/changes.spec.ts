import { describe, expect, it } from 'vitest';
import { changedColumns } from './changes';

const row = {
	id: 3,
	name: 'GD Exemplo',
	website: null as string | null,
	visible: true,
	priority: 1,
	updatedAt: new Date('2025-01-02T10:00:00Z')
};

describe('changedColumns', () => {
	it('returns nothing when the form matches the row', () => {
		expect(changedColumns(row, { name: 'GD Exemplo', website: null, visible: true })).toEqual({});
	});

	it('returns only the changed values', () => {
		expect(
			changedColumns(row, { name: 'GD Exemplo', website: 'https://gd.pt', priority: 2 })
		).toEqual({ website: 'https://gd.pt', priority: 2 });
	});

	it('treats null and undefined alike, and compares dates by instant', () => {
		expect(changedColumns(row, { website: undefined })).toEqual({});
		expect(changedColumns(row, { updatedAt: new Date('2025-01-02T10:00:00.000Z') })).toEqual({});
		expect(changedColumns(row, { updatedAt: new Date('2025-01-03T10:00:00Z') })).toHaveProperty(
			'updatedAt'
		);
	});
});
