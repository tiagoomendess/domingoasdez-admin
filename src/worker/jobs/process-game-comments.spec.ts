import { describe, expect, it } from 'vitest';
import {
	buildArticle,
	groupGames,
	sectionIntro,
	type CommentGame,
	type PendingComment
} from './process-game-comments.rules.ts';

const first = () => 0;

const game = (overrides: Partial<CommentGame> = {}): CommentGame => ({
	id: 1,
	gameGroupId: 10,
	// Sunday 25 October 2026, 10:00 in Lisbon (UTC+0 after the DST change).
	date: new Date('2026-10-25T10:00:00Z'),
	homeTeamId: 100,
	awayTeamId: 200,
	homeClub: 'Fafe',
	awayClub: 'Arões',
	venue: 'Campo da Feira',
	groupName: 'Jornada 3',
	competitionName: 'Taça AF Braga',
	score: { home: 2, away: 1 },
	penaltiesHome: null,
	penaltiesAway: null,
	...overrides
});

const comment = (overrides: Partial<PendingComment> = {}): PendingComment => ({
	id: 1,
	gameId: 1,
	teamId: 100,
	content: 'Grande jogo.',
	...overrides
});

describe('sectionIntro', () => {
	it('fills the first template', () => {
		expect(sectionIntro(game(), first)).toBe(
			'O Fafe recebeu o Arões no Campo da Feira no dia 25 de outubro numa partida em que foram marcados 3 golos e que a equipa da casa levou a melhor. Vamos ver o que ambas as equipas têm a dizer sobre o encontro.'
		);
	});

	it('names the weekday and an unknown venue', () => {
		const fourth = () => 3 / 5;
		expect(sectionIntro(game({ venue: null }), fourth)).toMatch(
			/^domingo, 25 de outubro, o Fafe recebeu o Arões no Campo Desconhecido /
		);
	});

	it('uses Lisbon time for the day', () => {
		// 23:30 UTC on 28 June is 00:30 on the 29th in Lisbon (UTC+1).
		expect(sectionIntro(game({ date: new Date('2026-06-28T23:30:00Z') }), first)).toContain(
			'no dia 29 de junho'
		);
	});

	it('describes the outcome', () => {
		const text = (overrides: Partial<CommentGame>) => sectionIntro(game(overrides), first);
		expect(text({ score: { home: 0, away: 1 } })).toContain('a equipa visitante levou a melhor');
		expect(text({ score: { home: 1, away: 1 } })).toContain(
			'ambas as equipas não foram além de um empate'
		);
		expect(text({ score: { home: 1, away: 1 }, penaltiesHome: 4, penaltiesAway: 3 })).toContain(
			'foi preciso recorrer a grandes penalidades para desfazer o empate'
		);
	});
});

describe('groupGames', () => {
	it('groups games by game group in the order of their first comment', () => {
		const games = new Map([
			[1, game({ id: 1, gameGroupId: 10 })],
			[2, game({ id: 2, gameGroupId: 20 })],
			[3, game({ id: 3, gameGroupId: 10 })]
		]);
		const comments = [
			comment({ id: 1, gameId: 2 }),
			comment({ id: 2, gameId: 1 }),
			comment({ id: 3, gameId: 3 }),
			comment({ id: 4, gameId: 1, teamId: 200 })
		];
		expect(groupGames(comments, games).map((group) => group.map((g) => g.id))).toEqual([
			[2],
			[1, 3]
		]);
	});
});

describe('buildArticle', () => {
	it('writes a section per game with both comments', () => {
		const article = buildArticle(
			[game()],
			[
				comment({ id: 1, teamId: 100, content: 'Vitória justa.\nObrigado aos adeptos.' }),
				comment({ id: 2, teamId: 200, content: '' })
			],
			first
		);
		expect(article.title).toBe('Jornada 3 da Taça AF Braga de domingo');
		expect(article.tags).toBe('Jornada 3, Taça AF Braga, crónica');
		expect(article.coverTag).toBe('Fafe');
		expect(article.commentIds).toEqual([1, 2]);
		expect(article.text).toContain('<h3><strong>Fafe 2-1 Arões</strong></h3><p>O Fafe recebeu');
		expect(article.text).toContain(
			'<p><strong>Comentário de Fafe:</strong><br/>Vitória justa.<br/>Obrigado aos adeptos.</p>'
		);
		expect(article.text).toContain(
			'<p><strong>Comentário de Arões:</strong><br/>Arões não enviou um comentário para este jogo.</p>'
		);
		expect(article.text).toMatch(/precisa de ser alterado antes de ser publicado!<\/p>$/);
	});

	it('shows the penalties', () => {
		const article = buildArticle(
			[game({ score: { home: 1, away: 1 }, penaltiesHome: 5, penaltiesAway: 4 })],
			[],
			first
		);
		expect(article.text).toContain('Fafe 1-1 (5-4 g.p.) Arões');
	});

	it('matches comments by game and team, not by team only', () => {
		const games = [game({ id: 1 }), game({ id: 2, homeClub: 'Vieira', awayTeamId: 300 })];
		const article = buildArticle(
			games,
			[
				comment({ id: 1, gameId: 2, teamId: 100, content: 'Comentário do jogo 2' }),
				comment({ id: 2, gameId: 1, teamId: 100, content: 'Comentário do jogo 1' })
			],
			first
		);
		const [section1, section2] = article.text.split('<h3>').slice(1);
		expect(section1).toContain('Comentário do jogo 1');
		expect(section2).toContain('Comentário do jogo 2');
		expect(article.commentIds).toEqual([1, 2]);
	});

	it('escapes comments and names', () => {
		const article = buildArticle(
			[game({ homeClub: 'A&B' })],
			[comment({ content: '<script>alert(1)</script> 3 < 4' })],
			first
		);
		expect(article.text).toContain('A&amp;B 2-1 Arões');
		expect(article.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt; 3 &lt; 4');
		expect(article.text).not.toContain('<script>');
	});
});
