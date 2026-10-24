import { describe, expect, it } from 'vitest';
import {
	buildAccountDeletedEmail,
	buildGameCommentEmail,
	buildScoreReportBanEmail
} from './messages.ts';

describe('buildGameCommentEmail', () => {
	const input = {
		to: 'clube@example.test',
		clubName: 'Fafe & Amigos',
		homeClub: 'Fafe & Amigos',
		awayClub: 'Arões',
		// Sunday 5 July 2026, 10:00 in Lisbon.
		gameDate: new Date('2026-07-05T09:00:00Z'),
		pin: '0427',
		// End of Monday 6 July in Lisbon.
		deadline: new Date('2026-07-06T22:59:59Z'),
		actionUrl: 'https://domingoasdez.com/flash-interview/u-1?pin=0427',
		unsubscribeUrl: 'https://domingoasdez.com/flash-interview/u-1/manage-notifications?pin=0427'
	};

	it('has the legacy subject and texts, dates in Lisbon time', () => {
		const mail = buildGameCommentEmail(input);
		expect(mail.to).toBe('clube@example.test');
		expect(mail.subject).toBe('Por favor comente o jogo Fafe & Amigos vs Arões');
		expect(mail.text).toContain('Olá Fafe & Amigos,');
		expect(mail.text).toContain(
			'sobre o jogo entre Fafe & Amigos e Arões, no dia 05 de julho de 2026.'
		);
		expect(mail.text).toContain(
			'Se pedir um PIN insira o seguinte 0427. Por favor preencha até 06/07/2026 23:59,'
		);
		expect(mail.text).toContain(`Flash Interview: ${input.actionUrl}`);
		expect(mail.text).toContain(input.unsubscribeUrl);
	});

	it('escapes names and links in the HTML', () => {
		const mail = buildGameCommentEmail(input);
		expect(mail.html).toContain('<h2 style="font-size: 20px;">Olá Fafe &amp; Amigos,</h2>');
		expect(mail.html).not.toContain('Fafe & Amigos');
		expect(mail.html).toContain('href="https://domingoasdez.com/flash-interview/u-1?pin=0427"');
		expect(mail.html).toContain('insira o seguinte <strong>0427</strong>.');
		expect(mail.html).toContain(
			'<b>por favor não marque como SPAM</b>, clique no seguinte link para <a href="https://domingoasdez.com/flash-interview/u-1/manage-notifications?pin=0427" style="color: #d32f2f;">desativar o envio destes emails</a>.'
		);
		expect(mail.html).toContain(
			'<a href="mailto:geral@domingoasdez.com">geral@domingoasdez.com</a>'
		);
	});
});

describe('buildScoreReportBanEmail', () => {
	it('names the user, the reason and the expiry in Lisbon time', () => {
		const mail = buildScoreReportBanEmail({
			to: 'ana@example.test',
			name: 'Ana',
			// 22:59 UTC on 5 November = 22:59 in Lisbon (winter); 21:59 UTC in July = 22:59.
			expiresAt: new Date('2026-07-20T21:59:00Z'),
			reason: 'Envio de um resultado falso no jogo A vs B'
		});
		expect(mail.subject).toBe('Você foi temporariamente bloqueado de enviar resultados');
		expect(mail.text).toMatch(/^Olá Ana\n\n/);
		expect(mail.text).toContain(
			'bloqueado de enviar resultados até 20/07/2026 às 22:59, pelo motivo: «Envio de um resultado falso no jogo A vs B».'
		);
		expect(mail.text).toContain('enviando um email para geral@domingoasdez.com.');
		expect(mail.text).toMatch(/Melhores Cumprimentos,\nDomingo às Dez$/);
		expect(mail.html).toContain('«Envio de um resultado falso no jogo A vs B»');
	});
});

describe('buildAccountDeletedEmail', () => {
	it('greets without a name when there is none', () => {
		const mail = buildAccountDeletedEmail({ to: 'ana@example.test', name: null });
		expect(mail.subject).toBe('A sua conta foi eliminada.');
		expect(mail.text).toMatch(/^Olá\n\nEste será o último email/);
	});
});
