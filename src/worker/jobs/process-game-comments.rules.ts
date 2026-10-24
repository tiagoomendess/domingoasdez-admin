import { sitePortugueseDate } from '../time.ts';

export type CommentGame = {
	id: number;
	gameGroupId: number;
	date: Date;
	homeTeamId: number;
	awayTeamId: number;
	homeClub: string;
	awayClub: string;
	venue: string | null;
	groupName: string | null;
	competitionName: string;
	score: { home: number; away: number };
	penaltiesHome: number | null;
	penaltiesAway: number | null;
};

export type PendingComment = { id: number; gameId: number; teamId: number; content: string };

/** `Math.random`, injected so tests pick the sentences. */
export type Random = () => number;

export type GroupArticle = {
	title: string;
	text: string;
	tags: string;
	/** Search term for the cover (legacy: a media item tagged with the first home club). */
	coverTag: string;
	/** Every pending comment of the group's games: all of them count as processed. */
	commentIds: number[];
};

const INTROS = [
	'O %home_club% recebeu o %away_club% no %venue% no dia %day% de %month% numa partida em que foram marcados %total_goals% golos e que %outcome%. %finish%',
	'O %away_club% deslocou-se ao terreno do %home_club%, o %venue%, no dia %day% de %month% para disputar uma partida em que %outcome%. %finish%',
	'O %home_club% e o %away_club% defrontaram-se no %venue% no dia %day% de %month% numa partida em que foram marcados %total_goals% golos e que %outcome%. %finish%',
	'%day_of_week%, %day% de %month%, o %home_club% recebeu o %away_club% no %venue% numa partida em que foram marcados %total_goals% golos onde %outcome%. %finish%',
	'%venue% foi o palco do encontro entre %home_club% e %away_club% no dia %day% de %month% num jogo em que foram marcados %total_goals% golos e que %outcome%. %finish%'
];

const FINISHES = [
	'Vamos ver o que ambas as equipas têm a dizer sobre o encontro.',
	'Vamos agora ouvir as declarações dos treinadores.',
	'O que têm para dizer as duas equipas sobre o jogo?',
	'Qual será a leitura do jogo de ambas as equipas?',
	'Vamos ler as reações de ambas as equipas ao jogo.',
	'Será que ambos os clubes concordam na leitura da partida?',
	'O que têm a dizer os clubes sobre o jogo?',
	'Vamos ler as opiniões dos intervenientes.'
];

const DISCLAIMER =
	'<p>Atenção! Este artigo foi gerado automaticamente e precisa de ser alterado antes de ser publicado!</p>';

const pick = <T>(items: T[], random: Random) => items[Math.floor(random() * items.length)];

const escapeHtml = (text: string) =>
	text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');

/** Legacy `Game::decidedByPenalties()`: a draw with both penalty scores set. */
const decidedByPenalties = (game: CommentGame) =>
	game.score.home === game.score.away && game.penaltiesHome !== null && game.penaltiesAway !== null;

function scoreText(game: CommentGame) {
	const score = `${game.score.home}-${game.score.away}`;
	return decidedByPenalties(game)
		? `${score} (${game.penaltiesHome}-${game.penaltiesAway} g.p.)`
		: score;
}

function outcome(game: CommentGame) {
	if (game.score.home === game.score.away) {
		return decidedByPenalties(game)
			? 'foi preciso recorrer a grandes penalidades para desfazer o empate'
			: 'ambas as equipas não foram além de um empate';
	}
	return game.score.home > game.score.away
		? 'a equipa da casa levou a melhor'
		: 'a equipa visitante levou a melhor';
}

/** Legacy `buildSectionIntro`: a random sentence about the game, as plain text. */
export function sectionIntro(game: CommentGame, random: Random): string {
	const values: Record<string, string> = {
		home_club: game.homeClub,
		away_club: game.awayClub,
		venue: game.venue ?? 'Campo Desconhecido',
		day: sitePortugueseDate.day(game.date),
		day_of_week: sitePortugueseDate.weekday(game.date),
		month: sitePortugueseDate.month(game.date),
		total_goals: String(game.score.home + game.score.away),
		outcome: outcome(game)
	};
	const intro = pick(INTROS, random);
	const finish = pick(FINISHES, random);
	return intro
		.replace(/%(\w+)%/g, (token, key: string) => values[key] ?? token)
		.replace('%finish%', finish);
}

function commentParagraph(club: string, comment: PendingComment | undefined) {
	const content = comment?.content.trim();
	const body = content
		? escapeHtml(content).replace(/\r?\n/g, '<br/>')
		: `${escapeHtml(club)} não enviou um comentário para este jogo.`;
	return `<p><strong>Comentário de ${escapeHtml(club)}:</strong><br/>${body}</p>`;
}

/**
 * Legacy grouping: the comments' games by game group, groups and games in the order their first
 * comment comes (comments by id).
 */
export function groupGames(
	comments: PendingComment[],
	games: ReadonlyMap<number, CommentGame>
): CommentGame[][] {
	const groups = new Map<number, CommentGame[]>();
	const seen = new Set<number>();
	for (const comment of comments) {
		const game = games.get(comment.gameId);
		if (!game || seen.has(game.id)) continue;
		seen.add(game.id);
		groups.set(game.gameGroupId, [...(groups.get(game.gameGroupId) ?? []), game]);
	}
	return [...groups.values()];
}

/**
 * Legacy `ProcessGameComments` article for one game group: a section per game (score, intro,
 * each team's comment). Fixes from legacy: comments are matched by game and team (legacy looked
 * them up by team only, so a team with two pending comments could get the other game's), the
 * text is HTML-escaped, the score falls back to the goals like everywhere else, and dates are in
 * Lisbon time.
 */
export function buildArticle(
	games: CommentGame[],
	comments: PendingComment[],
	random: Random
): GroupArticle {
	const first = games[0];
	const groupName = first.groupName ?? '';
	const ids = new Set(games.map((game) => game.id));
	const groupComments = comments.filter((comment) => ids.has(comment.gameId));
	// Several comments for one team and game: the first one with text.
	const commentOf = (gameId: number, teamId: number) => {
		const matching = groupComments.filter((c) => c.gameId === gameId && c.teamId === teamId);
		return matching.find((c) => c.content.trim()) ?? matching[0];
	};

	const sections = games.map((game) =>
		[
			`<h3><strong>${escapeHtml(`${game.homeClub} ${scoreText(game)} ${game.awayClub}`)}</strong></h3>`,
			`<p>${escapeHtml(sectionIntro(game, random))}</p>`,
			commentParagraph(game.homeClub, commentOf(game.id, game.homeTeamId)),
			commentParagraph(game.awayClub, commentOf(game.id, game.awayTeamId))
		].join('')
	);

	return {
		// articles.title is 155 characters.
		title:
			`${groupName} da ${first.competitionName} de ${sitePortugueseDate.weekday(first.date)}`.slice(
				0,
				155
			),
		text: sections.join('') + DISCLAIMER,
		tags: `${groupName}, ${first.competitionName}, crónica`,
		coverTag: first.homeClub,
		commentIds: groupComments.map((comment) => comment.id)
	};
}
