import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import {
	integer,
	localizeIssue,
	optionalDate,
	optionalEmail,
	optionalFile,
	optionalId,
	optionalText,
	optionalUrl,
	required,
	requiredId,
	requiredText,
	requiredUrl
} from './validation';

/** First error message, translated like `parseForm` does (base locale: pt-PT). */
function errorOf(schema: z.ZodType, input: unknown) {
	const result = schema.safeParse(input, { error: localizeIssue });
	return result.success ? null : result.error.issues[0].message;
}

describe('text fields', () => {
	it('trims and requires a value', () => {
		expect(requiredText(10).parse('  FC Porto  ')).toBe('FC Porto');
		expect(errorOf(requiredText(10), '   ')).toBe('Campo obrigatório.');
		expect(errorOf(requiredText(10), undefined)).toBe('Campo obrigatório.');
		expect(errorOf(requiredText(5), 'too long')).toBe('Máximo de 5 caracteres.');
	});

	it('turns blank optional values into null', () => {
		expect(optionalText(10).parse('')).toBeNull();
		expect(optionalText(10).parse(undefined)).toBeNull();
		expect(optionalText(10).parse(' x ')).toBe('x');
	});
});

describe('optionalEmail', () => {
	it('validates the address', () => {
		expect(optionalEmail(155).parse('geral@clube.pt')).toBe('geral@clube.pt');
		expect(optionalEmail(155).parse('')).toBeNull();
		expect(errorOf(optionalEmail(155), 'geral@')).toBe('Endereço de email inválido.');
	});
});

describe('requiredUrl', () => {
	it('requires an http(s) link', () => {
		expect(requiredUrl(150).parse(' https://parceiro.pt ')).toBe('https://parceiro.pt');
		expect(errorOf(requiredUrl(150), '')).toBe('Campo obrigatório.');
		expect(errorOf(requiredUrl(150), 'javascript:alert(1)')).toBe(m.validation_url());
		expect(errorOf(requiredUrl(20), 'https://parceiro.pt/promocao')).toBe(
			'Máximo de 20 caracteres.'
		);
	});
});

describe('optionalUrl', () => {
	it('accepts http(s) links only', () => {
		expect(optionalUrl(155).parse('https://clube.pt/historia')).toBe('https://clube.pt/historia');
		expect(optionalUrl(155).parse('')).toBeNull();
		expect(errorOf(optionalUrl(155), 'javascript:alert(1)')).toBe(m.validation_url());
		expect(errorOf(optionalUrl(155), 'ftp://clube.pt')).toBe(m.validation_url());
		expect(errorOf(optionalUrl(155), 'clube')).toBe(m.validation_url());
	});
});

describe('optionalDate', () => {
	it('accepts real calendar dates', () => {
		expect(optionalDate().parse('1904-02-28')).toBe('1904-02-28');
		expect(optionalDate().parse('')).toBeNull();
		expect(errorOf(optionalDate(), '2023-02-30')).toBe('Data inválida.');
		expect(errorOf(optionalDate(), '28/02/1904')).toBe('Data inválida.');
	});
});

describe('integer', () => {
	it('parses whole numbers in range', () => {
		const priority = required(integer(0, 100));
		expect(priority.parse(' 42 ')).toBe(42);
		expect(errorOf(priority, '')).toBe('Campo obrigatório.');
		expect(errorOf(priority, '4.5')).toBe('Indique um número inteiro.');
		expect(errorOf(priority, '-1')).toBe('Indique um número inteiro.');
		expect(errorOf(priority, '101')).toBe('O valor máximo é 100.');
	});
});

describe('ids', () => {
	it('reads positive ids', () => {
		expect(requiredId().parse('12')).toBe(12);
		expect(errorOf(requiredId(), '')).toBe('Campo obrigatório.');
		expect(errorOf(requiredId(), '0')).toBe('O valor mínimo é 1.');
		expect(optionalId().parse('')).toBeNull();
		expect(errorOf(optionalId(), 'abc')).toBe('Indique um número inteiro.');
	});
});

describe('optionalFile', () => {
	const schema = optionalFile({
		maxBytes: 1024,
		types: ['image/png', 'image/svg+xml'],
		typesLabel: 'PNG, SVG'
	});

	it('treats "no file chosen" as null', () => {
		expect(schema.parse(undefined)).toBeNull();
		expect(schema.parse(new File([], '', { type: 'application/octet-stream' }))).toBeNull();
	});

	it('checks type and size', () => {
		const png = new File([new Uint8Array(10)], 'emblem.png', { type: 'image/png' });
		expect(schema.parse(png)).toBe(png);
		expect(errorOf(schema, new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }))).toBe(
			'Formato não suportado. Use PNG, SVG.'
		);
		expect(
			errorOf(schema, new File([new Uint8Array(2048)], 'big.png', { type: 'image/png' }))
		).toBe('O ficheiro não pode ter mais de 1 KB.');
	});

	it('rejects text sent in place of a file', () => {
		expect(errorOf(schema, 'emblem.png')).toBe('Valor inválido.');
	});
});

describe('localizeIssue', () => {
	it('falls back to a generic message for other issues', () => {
		expect(errorOf(z.enum(['a', 'b']), 'c')).toBe('Valor inválido.');
		expect(errorOf(z.object({ visible: z.boolean() }), { visible: 'yes' })).toBe('Valor inválido.');
	});
});
