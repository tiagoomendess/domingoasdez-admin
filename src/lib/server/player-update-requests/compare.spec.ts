import { describe, expect, it } from 'vitest';
import {
	approveSchema,
	compareRequest,
	denySchema,
	similarText,
	suggestTeam,
	type PlayerValues,
	type RequestValues
} from './compare';

const emptyRequest: RequestValues = {
	playerId: 5,
	name: null,
	nickname: null,
	pictureUrl: null,
	associationId: null,
	phone: null,
	email: null,
	facebookProfile: null,
	birthDate: null,
	position: null,
	obs: null,
	clubName: null
};

const player: PlayerValues = {
	name: 'João Silva',
	nickname: 'Jota',
	picture: '/storage/media/images/a.jpg',
	associationId: null,
	phone: null,
	email: null,
	facebookProfile: null,
	birthDate: '1990-01-02 00:00:00',
	position: 'none',
	teamId: 3,
	clubName: 'Fragoso'
};

describe('compareRequest', () => {
	it('lists only the fields the request sends, marking real changes', () => {
		const rows = compareRequest(
			{ ...emptyRequest, name: 'João Silva', nickname: 'Joca', birthDate: '1990-01-02 00:00:00' },
			player
		);
		expect(rows.map((row) => [row.field, row.changed])).toEqual([
			['name', false],
			['nickname', true],
			['birth_date', false]
		]);
	});

	it('always counts a picture link as a change', () => {
		const [row] = compareRequest({ ...emptyRequest, pictureUrl: 'https://x/y.jpg' }, player);
		expect(row).toMatchObject({ field: 'picture', current: player.picture, changed: true });
	});

	it('compares the club by name', () => {
		expect(compareRequest({ ...emptyRequest, clubName: 'Fragoso' }, player)[0].changed).toBe(false);
		expect(compareRequest({ ...emptyRequest, clubName: 'Carapeços' }, player)[0].changed).toBe(
			true
		);
	});

	it('only treats "no club" as a change when the player has a team (legacy bug)', () => {
		expect(compareRequest({ ...emptyRequest, clubName: 'no_club' }, player)[0].changed).toBe(true);
		expect(
			compareRequest({ ...emptyRequest, clubName: 'no_club' }, { ...player, teamId: null })[0]
				.changed
		).toBe(false);
	});

	it('uses the note as notes only for a new player', () => {
		const note = { ...emptyRequest, obs: 'Visto em Fragoso' };
		expect(compareRequest(note, player)).toEqual([]);
		expect(compareRequest({ ...note, playerId: null }, null)).toEqual([
			{ field: 'obs', current: null, requested: 'Visto em Fragoso', changed: true }
		]);
	});
});

describe('suggestTeam', () => {
	const teams = [
		{ id: 1, name: 'Séniores' },
		{ id: 2, name: 'Séniores Feminino' },
		{ id: 3, name: 'Veteranos' }
	];

	it('maps "Seniores Masculino" to Séniores', () => {
		expect(suggestTeam('Seniores Masculino', teams)?.id).toBe(1);
	});

	it('matches other squads by name, ignoring accents', () => {
		expect(suggestTeam('Séniores Feminino', teams)?.id).toBe(2);
		expect(suggestTeam('veteranos', teams)?.id).toBe(3);
	});

	it('suggests nothing below the threshold', () => {
		expect(suggestTeam('Juniores', teams)).toBeNull();
		expect(suggestTeam(null, teams)).toBeNull();
	});

	it('ports PHP similar_text', () => {
		expect(similarText('World', 'Word')).toBe(4);
	});
});

describe('review forms', () => {
	it('reads the ticked fields', () => {
		expect(approveSchema.parse({}).fields).toEqual([]);
		expect(approveSchema.parse({ fields: 'name' }).fields).toEqual(['name']);
		expect(approveSchema.parse({ fields: ['name', 'club'], team_id: '4' })).toMatchObject({
			fields: ['name', 'club'],
			team_id: 4,
			review_notes: null
		});
		expect(approveSchema.safeParse({ fields: ['hack'] }).success).toBe(false);
	});

	it('requires a reason to deny', () => {
		expect(denySchema.safeParse({ review_notes: '  ok ' }).success).toBe(false);
		expect(denySchema.safeParse({ review_notes: 'Duplicado' }).success).toBe(true);
	});
});
