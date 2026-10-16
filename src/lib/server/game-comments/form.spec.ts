import { describe, expect, it } from 'vitest';
import { commentFormSchema, commentStatus, newPin, plainText } from './form';

describe('commentStatus', () => {
	const now = new Date('2026-10-16T12:00:00Z');
	const later = new Date('2026-10-17T22:59:00Z');
	const earlier = new Date('2026-10-15T22:59:00Z');

	it('follows the content, the deadline and the legacy `used` flag', () => {
		expect(commentStatus({ content: '', deadline: later, used: false }, now)).toBe('waiting');
		expect(commentStatus({ content: '  ', deadline: earlier, used: false }, now)).toBe('expired');
		expect(commentStatus({ content: 'Bom jogo', deadline: earlier, used: false }, now)).toBe(
			'answered'
		);
		expect(commentStatus({ content: '', deadline: earlier, used: true }, now)).toBe('used');
	});
});

describe('helpers', () => {
	it('stores plain text like the public form (strip_tags)', () => {
		expect(plainText('<b>Bom</b> jogo<script>x()</script> ')).toBe('Bom jogox()');
		expect(plainText(null)).toBe('');
	});

	it('makes 4-digit PINs', () => {
		for (let i = 0; i < 20; i++) expect(newPin()).toMatch(/^\d{4}$/);
	});

	it('keeps the 1000 character limit and needs a deadline', () => {
		expect(
			commentFormSchema.safeParse({ content: 'x'.repeat(1001), deadline: '2026-10-17T23:59' })
				.success
		).toBe(false);
		expect(commentFormSchema.safeParse({ content: '', deadline: '' }).success).toBe(false);
		expect(
			commentFormSchema.parse({ content: '', deadline: '2026-10-17T23:59' }).content
		).toBeNull();
	});
});
