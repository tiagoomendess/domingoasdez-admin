import { describe, expect, it } from 'vitest';
import { gameFormSchema, parseReferees } from './form';

const formData = (entries: Record<string, string>) => {
	const data = new FormData();
	for (const [name, value] of Object.entries(entries)) data.append(name, value);
	return data;
};

describe('parseReferees', () => {
	it('reads the pairs in order and skips empty rows', () => {
		const { rows, errors } = parseReferees(
			formData({
				referee_1: '7',
				type_1: '2',
				referee_0: '3',
				type_0: '1',
				referee_2: '',
				type_2: ''
			})
		);
		expect(errors).toEqual({});
		expect(rows).toEqual([
			{ refereeId: 3, typeId: 1 },
			{ refereeId: 7, typeId: 2 }
		]);
	});

	it('needs a referee and a role on every row (legacy dropped them all)', () => {
		const { rows, errors } = parseReferees(
			formData({ referee_0: '', type_0: '1', referee_1: '4' })
		);
		expect(rows).toEqual([]);
		expect(Object.keys(errors).sort()).toEqual(['referee_0', 'type_1']);
	});

	it('refuses the same referee twice and more than 8', () => {
		expect(
			Object.keys(
				parseReferees(formData({ referee_0: '3', type_0: '1', referee_1: '3', type_1: '2' })).errors
			)
		).toEqual(['referee_1']);
		const nine = Object.fromEntries(
			Array.from({ length: 9 }, (_, i) => [
				[`referee_${i}`, String(i + 1)],
				[`type_${i}`, '2']
			]).flat()
		);
		expect(parseReferees(formData(nine)).errors.referees).toHaveLength(1);
	});
});

describe('gameFormSchema', () => {
	const valid = {
		home_team_id: '1',
		away_team_id: '2',
		game_group_id: '3',
		round: '4',
		date: '2026-10-18T10:00'
	};

	it('keeps an empty score as null (the site then counts the goals)', () => {
		const data = gameFormSchema.parse({ ...valid, goals_home: '', goals_away: '2' });
		expect(data.goals_home).toBeNull();
		expect(data.goals_away).toBe(2);
	});

	it('keeps the legacy limits', () => {
		expect(gameFormSchema.safeParse({ ...valid, goals_home: '100' }).success).toBe(false);
		expect(gameFormSchema.safeParse({ ...valid, round: '10000' }).success).toBe(false);
		expect(gameFormSchema.safeParse({ ...valid, date: '18/10/2026' }).success).toBe(false);
	});
});
