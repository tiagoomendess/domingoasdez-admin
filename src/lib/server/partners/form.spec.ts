import { describe, expect, it } from 'vitest';
import { parseForm } from '#lib/server/forms.ts';
import { partnerColumns, partnerFormSchema, PICTURE_MAX_BYTES, pictureTags } from './form';

function formData(entries: Record<string, string | File>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.append(key, value);
	return data;
}

/** What the browser sends for the edit form (no picture input). */
const minimal = { name: 'Café Central', url: 'https://cafecentral.pt', priority: '1' };

describe('partnerFormSchema', () => {
	it('accepts the minimal form and maps it to columns', () => {
		const result = parseForm(partnerFormSchema, formData(minimal));
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.picture).toBeNull();
		expect(partnerColumns(result.data)).toEqual({
			name: 'Café Central',
			url: 'https://cafecentral.pt',
			priority: 1,
			visible: false
		});
	});

	it('reads every field', () => {
		const jpeg = new File([new Uint8Array(10)], 'logo.jpg', { type: 'image/jpeg' });
		const result = parseForm(
			partnerFormSchema,
			formData({
				...minimal,
				name: '  Café Central ',
				priority: '100',
				visible: 'on',
				picture: jpeg
			})
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.picture).toBe(jpeg);
		expect(partnerColumns(result.data)).toMatchObject({
			name: 'Café Central',
			priority: 100,
			visible: true
		});
	});

	it('applies the legacy rules', () => {
		const result = parseForm(
			partnerFormSchema,
			formData({
				name: 'x'.repeat(51),
				url: 'cafecentral',
				priority: '0',
				picture: new File([new Uint8Array(10)], 'logo.svg', { type: 'image/svg+xml' })
			})
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(Object.keys(result.errors).sort()).toEqual(['name', 'picture', 'priority', 'url']);
		expect(result.values).toMatchObject({ priority: '0', url: 'cafecentral' });
	});

	it('caps the url at the column size and the priority at 100', () => {
		const result = parseForm(
			partnerFormSchema,
			formData({ ...minimal, url: `https://cafecentral.pt/${'a'.repeat(130)}`, priority: '101' })
		);
		expect(!result.success && result.errors).toMatchObject({
			url: ['Máximo de 150 caracteres.'],
			priority: ['O valor máximo é 100.']
		});
	});

	it('requires the name, url and priority', () => {
		const result = parseForm(partnerFormSchema, formData({ name: ' ', url: '', priority: '' }));
		expect(!result.success && result.errors).toMatchObject({
			name: ['Campo obrigatório.'],
			url: ['Campo obrigatório.'],
			priority: ['Campo obrigatório.']
		});
	});

	it('limits the picture to 20000 KB', () => {
		const big = new File([new Uint8Array(PICTURE_MAX_BYTES + 1)], 'p.png', { type: 'image/png' });
		const result = parseForm(partnerFormSchema, formData({ ...minimal, picture: big }));
		expect(!result.success && result.errors.picture).toEqual([
			'O ficheiro não pode ter mais de 19.5 MB.'
		]);
	});
});

describe('pictureTags', () => {
	it('uses the legacy media library tags', () => {
		expect(pictureTags('Café Central Lda').join(',')).toBe('Café,Central,Lda');
	});
});
