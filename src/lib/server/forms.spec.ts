import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { checkbox, formDataToObject, parseForm } from './forms';

function formData(entries: [string, string][]) {
	const data = new FormData();
	for (const [key, value] of entries) data.append(key, value);
	return data;
}

describe('formDataToObject', () => {
	it('turns repeated keys into arrays', () => {
		expect(
			formDataToObject(
				formData([
					['name', 'Benfica'],
					['tags', 'a'],
					['tags', 'b']
				])
			)
		).toEqual({ name: 'Benfica', tags: ['a', 'b'] });
	});
});

describe('parseForm', () => {
	const schema = z.object({
		email: z.email(),
		password: z.string().min(8),
		visible: checkbox
	});

	it('returns typed data', () => {
		const result = parseForm(
			schema,
			formData([
				['email', 'admin@example.com'],
				['password', 'long-enough'],
				['visible', 'on']
			])
		);
		expect(result).toEqual({
			success: true,
			data: { email: 'admin@example.com', password: 'long-enough', visible: true },
			values: { email: 'admin@example.com', visible: 'on' }
		});
	});

	it('returns translated field errors and refill values, never the password', () => {
		const result = parseForm(
			schema,
			formData([
				['email', 'nope'],
				['password', 'short']
			])
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(Object.keys(result.errors).sort()).toEqual(['email', 'password']);
		// The base locale (pt-PT) outside a request.
		expect(result.errors.email).toEqual(['Endereço de email inválido.']);
		expect(result.errors.password).toEqual(['Mínimo de 8 caracteres.']);
		expect(result.values).toEqual({ email: 'nope' });
	});

	it('treats a missing checkbox as false', () => {
		expect(checkbox.parse(undefined)).toBe(false);
	});
});
