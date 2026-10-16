import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '#lib/auth/permissions.ts';
import { isUsedByCode, missingPermissions, permissionFormSchema } from './form';

const valid = (name: string) => permissionFormSchema.safeParse({ name }).success;

describe('permissionFormSchema', () => {
	it('accepts the names the code uses', () => {
		for (const name of ['admin', 'clubs.edit', 'score-report-bans', 'game_groups.create']) {
			expect(valid(name)).toBe(true);
		}
	});

	it('rejects other shapes', () => {
		for (const name of [
			'',
			'Clubs',
			'clubs.',
			'.clubs',
			'clubs..edit',
			'clubs edit',
			'a'.repeat(101)
		]) {
			expect(valid(name)).toBe(false);
		}
	});
});

describe('isUsedByCode', () => {
	it('knows the checked names', () => {
		expect(isUsedByCode('clubs.edit')).toBe(true);
		expect(isUsedByCode('old_feature')).toBe(false);
	});
});

describe('missingPermissions', () => {
	it('lists the checked names without a row', () => {
		const existing = PERMISSIONS.filter((name) => name !== 'polls.edit');
		expect(missingPermissions([...existing, 'old_feature'])).toEqual(['polls.edit']);
	});
});
