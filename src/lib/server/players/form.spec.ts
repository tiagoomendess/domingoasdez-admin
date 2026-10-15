import { describe, expect, it } from 'vitest';
import {
	birthDateInput,
	birthDateValue,
	pictureTags,
	playerColumns,
	playerFormSchema,
	titleCase
} from './form';

const valid = { name: 'joão silva', position: 'none', visible: 'on' };

describe('playerFormSchema', () => {
	it('accepts the legacy fields and turns blanks into null', () => {
		const result = playerFormSchema.safeParse({
			...valid,
			nickname: '',
			birth_date: '2003-04-03',
			phone: '912345678',
			email: 'a@b.pt',
			facebook_profile: 'https://facebook.com/x',
			team_id: '12'
		});
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.nickname).toBeNull();
		expect(result.data.team_id).toBe(12);
		expect(result.data.picture).toBeNull();
	});

	it('keeps the legacy length limits', () => {
		const fails = (extra: Record<string, string>) =>
			!playerFormSchema.safeParse({ ...valid, ...extra }).success;
		expect(fails({ name: 'Jo' })).toBe(true);
		expect(fails({ nickname: 'J' })).toBe(true);
		expect(fails({ phone: '12345' })).toBe(true);
		expect(fails({ phone: '123456789012345' })).toBe(true);
		expect(fails({ obs: 'curta' })).toBe(true);
		expect(fails({ email: 'x'.repeat(96) + '@b.pt' })).toBe(true);
	});

	it('only accepts the position values of the column', () => {
		expect(playerFormSchema.safeParse({ ...valid, position: 'winger' }).success).toBe(false);
		expect(playerFormSchema.safeParse({ ...valid, position: 'goalkeeper' }).success).toBe(true);
	});

	it('maps to columns with the name in title case', () => {
		const result = playerFormSchema.parse({
			...valid,
			name: 'MARIA DA CONCEIÇÃO',
			birth_date: '2003-04-03'
		});
		expect(playerColumns(result)).toMatchObject({
			name: 'Maria Da Conceição',
			birthDate: '2003-04-03 00:00:00',
			teamId: null,
			visible: true
		});
	});
});

describe('helpers', () => {
	it('title-cases accented names (PHP left “JosÉ”)', () => {
		expect(titleCase('JOSÉ ÁLVARO')).toBe('José Álvaro');
		expect(titleCase('ana  o’neil')).toBe('Ana  O’neil');
	});

	it('converts the birth date', () => {
		expect(birthDateValue(null)).toBeNull();
		expect(birthDateInput('2003-04-03 00:00:00')).toBe('2003-04-03');
		expect(birthDateInput(null)).toBe('');
	});

	it('tags the picture like the legacy site', () => {
		expect(pictureTags('João Silva', null)).toEqual(['Jogador', 'João Silva']);
		expect(pictureTags('João Silva', 'Jota')).toEqual(['Jogador', 'João Silva', 'Jota']);
	});
});
