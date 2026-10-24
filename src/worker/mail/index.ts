import nodemailer, { type Transporter } from 'nodemailer';
import {
	MAIL_DRIVER,
	MAIL_ENCRYPTION,
	MAIL_FROM_ADDRESS,
	MAIL_FROM_NAME,
	MAIL_HOST,
	MAIL_PASSWORD,
	MAIL_PORT,
	MAIL_USERNAME
} from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { emailOutbox } from '#lib/server/db/schema.ts';
import type { Logger } from '../log.ts';

/**
 * The worker's emails, over the site's own SMTP server: a port of domingoasdez-app's
 * `src/lib/server/mail.ts` (same MAIL_* settings), plus the legacy `email_outbox` log.
 */

/** A built email (see `messages.ts`); the sender comes from MAIL_FROM_*. */
export type Mail = { to: string; subject: string; text: string; html: string };

export type SmtpSettings = {
	driver: string;
	host: string | undefined;
	port: number;
	username: string | undefined;
	password: string | undefined;
	encryption: string;
};

export type SmtpOptions = {
	host: string;
	port: number;
	secure: boolean;
	auth?: { user: string; pass: string };
	requireTLS?: boolean;
};

/** Same rules as the app: `ssl` or port 465 is implicit TLS, `tls` requires STARTTLS. */
export function smtpOptions(settings: SmtpSettings): SmtpOptions {
	if (settings.driver !== 'smtp') {
		throw new Error(`Unsupported MAIL_DRIVER "${settings.driver}". Only smtp is supported.`);
	}
	if (!settings.host) throw new Error('MAIL_HOST is not set.');
	const secure = settings.encryption === 'ssl' || settings.port === 465;
	return {
		host: settings.host,
		port: settings.port,
		secure,
		auth: settings.username
			? { user: settings.username, pass: settings.password ?? '' }
			: undefined,
		...(settings.encryption === 'tls' && !secure ? { requireTLS: true } : {})
	};
}

let transporter: Transporter | undefined;

function transport(): Transporter {
	transporter ??= nodemailer.createTransport(
		smtpOptions({
			driver: MAIL_DRIVER,
			host: MAIL_HOST,
			port: MAIL_PORT,
			username: MAIL_USERNAME,
			password: MAIL_PASSWORD,
			encryption: MAIL_ENCRYPTION
		})
	);
	return transporter;
}

export type Sender = { name: string; address: string };

/** RFC 2822 date, as legacy's Swift Mailer wrote it (`Mon, 19 Oct 2026 05:02:12 +0000`). */
const mailDate = (date: Date) => date.toUTCString().replace('GMT', '+0000');

/**
 * The legacy `EmailOutboxProvider` row: addresses as `{"address": name}` JSON, `null` (the JSON
 * text, as PHP's `json_encode(null)`) for cc / bcc, the main headers, no attachments.
 */
export function outboxRow(mail: Mail, from: Sender, messageId: string, date: Date) {
	const fromHeader = `${from.name} <${from.address}>`;
	return {
		from: JSON.stringify({ [from.address]: from.name }),
		to: JSON.stringify({ [mail.to]: null }),
		cc: 'null',
		bcc: 'null',
		subject: mail.subject.slice(0, 255),
		body: mail.html,
		headers: JSON.stringify({
			'Content-Type': 'multipart/alternative',
			'MIME-Version': '1.0',
			Date: mailDate(date),
			'Message-ID': messageId,
			From: fromHeader,
			Subject: mail.subject,
			To: mail.to
		}),
		attachments: '[]'
	};
}

/**
 * Sends one email. Like legacy, the outbox row is written first (legacy logged every message on
 * `MessageSending`, sent or not); a failing outbox insert is logged and the mail still goes.
 * Send errors throw. Dry run: only logs recipient and subject.
 */
export async function sendMail(mail: Mail, { dryRun, log }: { dryRun: boolean; log: Logger }) {
	if (dryRun) {
		log.info(`dry run, not sent: "${mail.subject}" to ${mail.to}`);
		return;
	}
	const from: Sender = { name: MAIL_FROM_NAME, address: MAIL_FROM_ADDRESS };
	const domain = from.address.split('@')[1] ?? 'domingoasdez.com';
	const messageId = `<${crypto.randomUUID().replaceAll('-', '')}@${domain}>`;
	const date = new Date();
	try {
		await db.insert(emailOutbox).values(outboxRow(mail, from, messageId, date));
	} catch (error) {
		log.error('could not save the email to email_outbox', error);
	}
	await transport().sendMail({
		from,
		to: mail.to,
		subject: mail.subject,
		text: mail.text,
		html: mail.html,
		messageId,
		date
	});
	log.info(`sent "${mail.subject}" to ${mail.to}`);
}
