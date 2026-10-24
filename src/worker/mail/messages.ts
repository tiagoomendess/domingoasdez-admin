import { m } from '#lib/paraglide/messages.js';
import { siteDateTime, siteDay, sitePortugueseDate } from '../time.ts';
import type { Mail } from './index.ts';

/**
 * The worker's emails, without I/O. Texts are the legacy Portuguese strings
 * (`resources/lang/pt/emails.php`, `emails/game_comment.blade.php`); the HTML is the same simple
 * inline-styled page as domingoasdez-app's emails, with a plain text version.
 */

const locale = { locale: 'pt-PT' } as const;
const SITE_EMAIL = 'geral@domingoasdez.com';
const SITE_NAME = 'Domingo às Dez';

export const escapeHtml = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

/**
 * A message as HTML: the text (and its plain inputs) escaped, then `html` inputs (links, bold
 * words) put in place.
 */
function richText<I extends object>(
	message: (inputs: I, options: typeof locale) => string,
	inputs: Partial<Record<keyof I, string>>,
	html: Partial<Record<keyof I, string>> = {}
): string {
	const tokens = Object.keys(html).map((key, i) => [key, `\u0001${i}\u0001`] as const);
	let out = escapeHtml(message({ ...inputs, ...Object.fromEntries(tokens) } as I, locale));
	for (const [key, token] of tokens) out = out.replace(token, html[key as keyof I] ?? '');
	return out;
}

const link = (href: string, label: string, style = '') =>
	`<a href="${escapeHtml(href)}"${style ? ` style="${style}"` : ''}>${escapeHtml(label)}</a>`;

const BUTTON =
	'display: inline-block; background: #107db7; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600;';

function page(blocks: string[]): string {
	return `<!DOCTYPE html>
<html lang="pt">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; line-height: 1.5; margin: 0; padding: 24px;">
${blocks.map((block) => `  ${block}`).join('\n')}
</body>
</html>`;
}

const regards = {
	html: `<p>${escapeHtml(m.mail_regards({}, locale))},<br>${escapeHtml(SITE_NAME)}</p>`,
	text: `${m.mail_regards({}, locale)},\n${SITE_NAME}`
};

export type GameCommentEmailInput = {
	to: string;
	/** The club the team belongs to: the email speaks to it. */
	clubName: string;
	homeClub: string;
	awayClub: string;
	gameDate: Date;
	pin: string;
	deadline: Date;
	/** `/flash-interview/<uuid>?pin=<pin>` on the public site. */
	actionUrl: string;
	/** `/flash-interview/<uuid>/manage-notifications?pin=<pin>`. */
	unsubscribeUrl: string;
};

/** Legacy `GameCommentEmail`: asks a club to answer the flash interview of a game. */
export function buildGameCommentEmail(input: GameCommentEmailInput): Mail {
	const date = {
		day: sitePortugueseDate.day(input.gameDate),
		month: sitePortugueseDate.month(input.gameDate),
		year: siteDay(input.gameDate).slice(0, 4)
	};
	const deadline = siteDateTime(input.deadline);
	const deadlineText = `${deadline.date} ${deadline.time}`;
	const names = { home: input.homeClub, away: input.awayClub };
	const greeting = m.mail_game_comment_greeting({ club: input.clubName }, locale);
	const intro = m.mail_game_comment_intro({ ...names, ...date }, locale);
	const explain = m.mail_game_comment_explain({}, locale);
	const action = m.mail_game_comment_action({}, locale);
	const disable = m.mail_game_comment_disable({}, locale);
	const unsubscribe = m.mail_game_comment_unsubscribe({}, locale);
	const thanks = m.mail_game_comment_thanks({}, locale);
	const team = m.mail_game_comment_team({}, locale);
	const linkIntro = m.mail_game_comment_link({}, locale);

	const html = page([
		`<h2 style="font-size: 20px;">${escapeHtml(greeting)}</h2>`,
		`<p>${escapeHtml(intro)}</p>`,
		`<p>${escapeHtml(explain)}</p>`,
		`<p style="margin: 28px 0;">${link(input.actionUrl, action, BUTTON)}</p>`,
		`<p>${richText(m.mail_game_comment_pin, { deadline: deadlineText }, { pin: `<strong>${escapeHtml(input.pin)}</strong>` })}</p>`,
		`<p>${richText(
			m.mail_game_comment_no_spam,
			{},
			{
				not_spam: `<b>${escapeHtml(m.mail_game_comment_not_spam({}, locale))}</b>`,
				disable: link(input.unsubscribeUrl, disable, 'color: #d32f2f;')
			}
		)}</p>`,
		`<p>${escapeHtml(linkIntro)}<br>${link(input.actionUrl, input.actionUrl)}</p>`,
		`<p>${richText(m.mail_game_comment_late, {}, { email: link(`mailto:${SITE_EMAIL}`, SITE_EMAIL) })}</p>`,
		`<p>${escapeHtml(thanks)}<br>${escapeHtml(team)}</p>`,
		`<p style="font-size: 13px; color: #6c6c70;">${richText(
			m.mail_game_comment_footer,
			{ club: input.clubName },
			{
				email: link(`mailto:${SITE_EMAIL}`, SITE_EMAIL),
				unsubscribe: link(input.unsubscribeUrl, unsubscribe)
			}
		)}</p>`
	]);

	const text = [
		greeting,
		intro,
		explain,
		`${action}: ${input.actionUrl}`,
		m.mail_game_comment_pin({ pin: input.pin, deadline: deadlineText }, locale),
		m.mail_game_comment_no_spam(
			{
				not_spam: m.mail_game_comment_not_spam({}, locale),
				disable: `${disable} (${input.unsubscribeUrl})`
			},
			locale
		),
		m.mail_game_comment_late({ email: SITE_EMAIL }, locale),
		`${thanks}\n${team}`,
		m.mail_game_comment_footer(
			{
				club: input.clubName,
				email: SITE_EMAIL,
				unsubscribe: `${unsubscribe} (${input.unsubscribeUrl})`
			},
			locale
		)
	].join('\n\n');

	return { to: input.to, subject: m.mail_game_comment_subject(names, locale), html, text };
}

/** A legacy Laravel notification: greeting, lines, regards. */
function notification(to: string, subject: string, name: string | null, lines: string[]): Mail {
	const greeting = m.mail_greeting({ name: name ?? '' }, locale).trim();
	return {
		to,
		subject,
		html: page([
			`<h2 style="font-size: 20px;">${escapeHtml(greeting)}</h2>`,
			...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
			regards.html
		]),
		text: [greeting, ...lines, regards.text].join('\n\n')
	};
}

/** Legacy `ScoreReportBanNotification`, with the expiry in Lisbon time (legacy wrote UTC). */
export function buildScoreReportBanEmail(input: {
	to: string;
	name: string | null;
	expiresAt: Date;
	reason: string;
}): Mail {
	const expiration = siteDateTime(input.expiresAt);
	return notification(input.to, m.mail_score_ban_subject({}, locale), input.name, [
		m.mail_score_ban_line_1(
			{
				expiration_date: m.mail_score_ban_expiration(expiration, locale),
				reason: input.reason
			},
			locale
		),
		m.mail_score_ban_line_2({}, locale),
		m.mail_score_ban_line_3({ site_email: SITE_EMAIL }, locale)
	]);
}

/** Legacy `GeneralBasicNotification` sent by `ProcessDeleteRequest`. */
export function buildAccountDeletedEmail(input: { to: string; name: string | null }): Mail {
	return notification(input.to, m.mail_account_deleted_subject({}, locale), input.name, [
		m.mail_account_deleted_body({}, locale)
	]);
}
