import { describe, expect, it } from 'vitest';
import {
	dayTimeline,
	IMAGES,
	seasonUrl,
	siteDayRange,
	type PlannedPost,
	type TimelineEntry,
	type TodayMatch
} from './schedule-social-media.rules.ts';

// Saturday 24 October 2026, 05:15 UTC = 06:15 in Lisbon (still summer time).
const now = new Date('2026-10-24T05:15:00Z');
const images = new Map(
	Object.values(IMAGES).map((name) => [name, `https://site.test/${name}.png`])
);

const match = (id: number, iso: string, overrides: Partial<TodayMatch> = {}): TodayMatch => ({
	id,
	date: new Date(iso),
	seasonId: 1,
	seasonName: '1ª Divisão Papagaio Loiro',
	competitionName: '2ª Divisão AFPB',
	competitionVisible: true,
	startYear: 2026,
	endYear: 2027,
	...overrides
});

const timeline = (matches: TodayMatch[], overrides: { images?: Map<string, string> } = {}) =>
	dayTimeline({
		matches,
		images: overrides.images ?? images,
		now,
		siteUrl: 'https://domingoasdez.com',
		random: () => 0
	});

const posts = (entries: TimelineEntry[]) =>
	entries.flatMap((entry) => (entry.kind === 'posts' ? entry.posts : []));
const row = (post: PlannedPost) =>
	`${post.publishAt.toISOString().slice(11, 16)} ${post.platform} ${post.postType} ${post.postContentType} ${post.mediaPath?.replace('https://site.test/social_media.', '').replace('.png', '') ?? ''} ${post.textContent ?? ''}`.trim();

describe('siteDayRange', () => {
	it('is the Lisbon day in UTC', () => {
		expect(siteDayRange(now)).toEqual({
			start: new Date('2026-10-23T23:00:00Z'),
			end: new Date('2026-10-24T22:59:59Z')
		});
	});
});

describe('seasonUrl', () => {
	it('builds the public standings link', () => {
		expect(seasonUrl('https://domingoasdez.com/', match(1, '2026-10-24T09:00:00Z'))).toBe(
			'https://domingoasdez.com/competicoes/2026-27/1a-divisao-papagaio-loiro'
		);
	});
});

describe('dayTimeline', () => {
	it('schedules nothing without games', () => {
		expect(timeline([])).toEqual([]);
	});

	it('builds the legacy timeline around the first kick-off', () => {
		const entries = timeline([
			match(10, '2026-10-24T09:00:00Z'),
			match(11, '2026-10-24T14:00:00Z', { seasonId: 2, seasonName: null, competitionName: 'Taça' })
		]);
		expect(posts(entries).map(row)).toEqual([
			'06:00 facebook story image story_today_has_game',
			'06:00 facebook post image post_today_has_game Hoje tem futebol popular, lista de jogos em 🔗 https://domingoasdez.com/jogos',
			'06:00 instagram story image story_today_has_game',
			'06:00 instagram post image post_today_has_game Hoje tem futebol popular, lista de jogos em 🔗 https://domingoasdez.com/jogos',
			'08:00 facebook story image story_directions_img',
			'08:00 instagram story image story_directions_img',
			'08:15 facebook story image story_game_history',
			'08:15 instagram story image story_game_history',
			'09:00 facebook story image story_live_matches_now',
			'09:00 instagram story image story_live_matches_now',
			'09:00 facebook post text  🔴 Acompanha aqui todos os resultados em direto ⤵️ https://domingoasdez.com/jogos',
			'09:10 facebook story image story_live_results',
			'09:10 facebook post image post_live_results Acompanha em 🔗 https://domingoasdez.com/jogos',
			'09:10 instagram story image story_live_results',
			'09:10 instagram post image post_live_results Acompanha em 🔗 https://domingoasdez.com/jogos',
			'09:15 facebook story image story_send_videos',
			'09:15 instagram story image story_send_videos',
			'09:45 facebook post image post_collaborate 🔴📣 Colabora e envia o resultado do jogo que estás a ver pelo site',
			'09:45 instagram post image post_collaborate 🔴📣 Colabora e envia o resultado do jogo que estás a ver pelo site',
			'10:00 facebook story image story_no_fake_results',
			'10:00 instagram story image story_no_fake_results',
			'11:00 facebook story image story_match_mvp',
			'11:00 instagram story image story_match_mvp',
			'11:15 facebook story image story_flash_interview',
			'11:15 instagram story image story_flash_interview',
			'12:00 facebook post text  Classificação da 1ª Divisão Papagaio Loiro atualizada ⤵️https://domingoasdez.com/competicoes/2026-27/1a-divisao-papagaio-loiro',
			'12:00 facebook post text  Classificação da Taça atualizada ⤵️https://domingoasdez.com/competicoes/2026-27/taca'
		]);
	});

	it('promotes up to 5 games, 10 minutes apart from 07:01 Lisbon', () => {
		const entries = timeline([
			match(1, '2026-10-24T09:00:00Z'),
			match(2, '2026-10-24T09:00:00Z'),
			match(3, '2026-10-24T10:00:00Z')
		]);
		const slots = entries.filter((entry) => entry.kind !== 'posts');
		expect(slots).toEqual([
			{ kind: 'promotion', gameId: 1, publishAt: new Date('2026-10-24T06:01:00Z') },
			{ kind: 'promotion', gameId: 2, publishAt: new Date('2026-10-24T06:11:00Z') },
			{ kind: 'promotion', gameId: 3, publishAt: new Date('2026-10-24T06:21:00Z') }
		]);
		// The promotions come right after the 07:00 posts, as legacy created them.
		expect(entries[1]).toEqual(slots[0]);
	});

	it('promotes 5 random games a minute apart, then the number of the others', () => {
		const matches = Array.from({ length: 7 }, (_, i) => match(i + 1, '2026-10-24T09:00:00Z'));
		const slots = timeline(matches).filter((entry) => entry.kind !== 'posts');
		expect(slots).toHaveLength(6);
		const promoted = slots.slice(0, 5);
		expect(new Set(promoted.map((slot) => slot.kind === 'promotion' && slot.gameId)).size).toBe(5);
		expect(promoted.map((slot) => slot.publishAt.toISOString().slice(11, 16))).toEqual([
			'06:01',
			'06:02',
			'06:03',
			'06:04',
			'06:05'
		]);
		expect(slots[5]).toEqual({
			kind: 'more-matches',
			remaining: 2,
			publishAt: new Date('2026-10-24T06:06:00Z')
		});
	});

	it('leaves out the posts of a missing image setting', () => {
		const partial = new Map(images);
		partial.delete(IMAGES.storyDirections);
		const rows = posts(timeline([match(1, '2026-10-24T09:00:00Z')], { images: partial })).map(row);
		expect(rows.some((r) => r.includes('story_directions_img'))).toBe(false);
		expect(rows.some((r) => r.includes('story_game_history'))).toBe(true);
	});

	it('posts the standings once per season, only for visible competitions', () => {
		const rows = posts(
			timeline([
				match(1, '2026-10-24T09:00:00Z'),
				match(2, '2026-10-24T09:30:00Z'),
				match(3, '2026-10-24T10:00:00Z', { seasonId: 9, competitionVisible: false })
			])
		)
			.map(row)
			.filter((r) => r.includes('Classificação'));
		expect(rows).toHaveLength(1);
	});
});
