import { describe, expect, it } from 'vitest';
import { placeholder } from '../images/sources.ts';
import { coverSources, type CoverSources } from './generate-game-image.rules.ts';

const game = (overrides: Partial<CoverSources> = {}): CoverSources => ({
	gameId: 8716,
	playgroundId: 51,
	playgroundPicture: '/storage/media/images/field.jpg',
	homeEmblem: '/storage/media/images/home.png',
	awayEmblem: '/storage/media/images/away.png',
	seasonName: '1ª Divisão Papagaio Loiro',
	seasonPicture: '/storage/media/images/season.png',
	competitionName: '2ª Divisão AFPB',
	competitionPicture: '/storage/media/images/competition.png',
	...overrides
});

describe('placeholder', () => {
	it('picks by the last digit of the id', () => {
		expect(placeholder('16_9', 8716)).toBe('/images/16_9_placeholder_6.jpg');
		expect(placeholder('1_1', 70)).toBe('/images/1_1_placeholder_0.jpg');
	});
});

describe('coverSources', () => {
	it('uses the playground picture, the emblems and the season', () => {
		expect(coverSources(game())).toEqual({
			background: '/storage/media/images/field.jpg',
			homeEmblem: '/storage/media/images/home.png',
			awayEmblem: '/storage/media/images/away.png',
			competition: '1ª Divisão Papagaio Loiro',
			competitionLogo: '/storage/media/images/season.png'
		});
	});

	it('uses the 1:1 placeholder of a playground without picture (legacy swap)', () => {
		expect(coverSources(game({ playgroundId: 76, playgroundPicture: null })).background).toBe(
			'/images/1_1_placeholder_6.jpg'
		);
	});

	it("uses the game's 16:9 placeholder without a playground", () => {
		expect(coverSources(game({ playgroundId: null, playgroundPicture: null })).background).toBe(
			'/images/16_9_placeholder_6.jpg'
		);
	});

	it('falls back to the default emblem and the competition', () => {
		const sources = coverSources(
			game({ homeEmblem: null, awayEmblem: '', seasonName: null, seasonPicture: null })
		);
		expect(sources.homeEmblem).toBe('/images/default-emblem.png');
		expect(sources.awayEmblem).toBe('/images/default-emblem.png');
		expect(sources.competition).toBe('2ª Divisão AFPB');
		expect(sources.competitionLogo).toBe('/storage/media/images/competition.png');
	});

	it('has no logo when neither the season nor the competition has one', () => {
		expect(
			coverSources(game({ seasonPicture: null, competitionPicture: null })).competitionLogo
		).toBeNull();
	});
});
