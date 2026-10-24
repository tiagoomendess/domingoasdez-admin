import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordingLogger } from '../test-helpers.ts';

const sent = vi.hoisted(() => [] as unknown[]);
const inserted = vi.hoisted(() => [] as unknown[]);
const order = vi.hoisted(() => [] as string[]);

vi.mock('$app/env/private', () => ({
	MAIL_DRIVER: 'smtp',
	MAIL_HOST: 'smtp.example.test',
	MAIL_PORT: 587,
	MAIL_USERNAME: 'worker',
	MAIL_PASSWORD: 'secret',
	MAIL_ENCRYPTION: 'tls',
	MAIL_FROM_ADDRESS: 'geral@domingoasdez.com',
	MAIL_FROM_NAME: 'Domingo às Dez'
}));
vi.mock('nodemailer', () => ({
	default: {
		createTransport: () => ({
			sendMail: async (message: unknown) => {
				order.push('send');
				sent.push(message);
			}
		})
	}
}));
vi.mock('#lib/server/db/index.ts', () => ({
	db: {
		insert: () => ({
			values: async (row: unknown) => {
				order.push('outbox');
				inserted.push(row);
			}
		})
	}
}));

const { outboxRow, sendMail, smtpOptions } = await import('./index.ts');

const mail = { to: 'clube@example.test', subject: 'Assunto', text: 'Texto', html: '<p>Texto</p>' };
const settings = {
	driver: 'smtp',
	host: 'smtp.example.test',
	port: 587,
	username: undefined,
	password: undefined,
	encryption: ''
};

describe('smtpOptions', () => {
	it('uses STARTTLS for tls, implicit TLS for ssl or port 465', () => {
		expect(smtpOptions({ ...settings, encryption: 'tls' })).toMatchObject({
			secure: false,
			requireTLS: true
		});
		expect(smtpOptions({ ...settings, encryption: 'ssl' })).toMatchObject({ secure: true });
		expect(smtpOptions({ ...settings, port: 465 })).toMatchObject({ secure: true });
		expect(smtpOptions(settings)).toEqual({
			host: 'smtp.example.test',
			port: 587,
			secure: false,
			auth: undefined
		});
	});

	it('authenticates only with a username', () => {
		expect(smtpOptions({ ...settings, username: 'u', password: 'p' }).auth).toEqual({
			user: 'u',
			pass: 'p'
		});
	});

	it('refuses other drivers and a missing host', () => {
		expect(() => smtpOptions({ ...settings, driver: 'mailgun' })).toThrow(/Only smtp/);
		expect(() => smtpOptions({ ...settings, host: undefined })).toThrow(/MAIL_HOST/);
	});
});

describe('outboxRow', () => {
	it('writes the legacy EmailOutboxProvider format', () => {
		const row = outboxRow(
			mail,
			{ name: 'Domingo às Dez', address: 'geral@domingoasdez.com' },
			'<abc@domingoasdez.com>',
			new Date('2026-10-19T05:02:12Z')
		);
		expect(row).toMatchObject({
			from: '{"geral@domingoasdez.com":"Domingo às Dez"}',
			to: '{"clube@example.test":null}',
			cc: 'null',
			bcc: 'null',
			subject: 'Assunto',
			body: '<p>Texto</p>',
			attachments: '[]'
		});
		expect(JSON.parse(row.headers)).toMatchObject({
			Date: 'Mon, 19 Oct 2026 05:02:12 +0000',
			'Message-ID': '<abc@domingoasdez.com>',
			From: 'Domingo às Dez <geral@domingoasdez.com>',
			To: 'clube@example.test'
		});
	});
});

describe('sendMail', () => {
	beforeEach(() => {
		sent.length = 0;
		inserted.length = 0;
		order.length = 0;
	});

	it('only logs in dry run', async () => {
		const log = recordingLogger();
		await sendMail(mail, { dryRun: true, log });
		expect(sent).toEqual([]);
		expect(inserted).toEqual([]);
		expect(log.lines).toEqual(['info: dry run, not sent: "Assunto" to clube@example.test']);
	});

	it('logs to the outbox, then sends from MAIL_FROM_*', async () => {
		await sendMail(mail, { dryRun: false, log: recordingLogger() });
		expect(order).toEqual(['outbox', 'send']);
		expect(sent[0]).toMatchObject({
			from: { name: 'Domingo às Dez', address: 'geral@domingoasdez.com' },
			to: 'clube@example.test',
			subject: 'Assunto',
			text: 'Texto',
			html: '<p>Texto</p>'
		});
		const { messageId } = sent[0] as { messageId: string };
		expect(messageId).toMatch(/^<[0-9a-f]{32}@domingoasdez\.com>$/);
		expect(JSON.parse((inserted[0] as { headers: string }).headers)['Message-ID']).toBe(messageId);
	});
});
