import { describe, expect, it } from 'vitest';
import { parseForm } from '#lib/server/forms.ts';
import { BODY_MAX_BYTES, byteLength, pageFormSchema, pictureTags } from './form';

function formData(entries: Record<string, string | File>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.append(key, value);
	return data;
}

const minimal = {
	title: 'Histórico de Campeões',
	name: 'Campeões',
	body: '<p>Texto</p>',
	picture: new File([], '')
};

describe('pageFormSchema', () => {
	it('accepts the minimal form', () => {
		const result = parseForm(pageFormSchema, formData(minimal));
		expect(result.success && result.data).toEqual({
			title: 'Histórico de Campeões',
			name: 'Campeões',
			body: '<p>Texto</p>',
			picture: null,
			visible: false
		});
	});

	it('applies the legacy limits', () => {
		const result = parseForm(
			pageFormSchema,
			formData({
				title: 'x'.repeat(156),
				name: 'x'.repeat(51),
				body: ' ',
				picture: new File([new Uint8Array(4)], 'p.gif', { type: 'image/gif' })
			})
		);
		expect(!result.success && Object.keys(result.errors).sort()).toEqual([
			'body',
			'name',
			'picture',
			'title'
		]);
	});

	it('reads the visible switch and a picture', () => {
		const png = new File([new Uint8Array(4)], 'p.png', { type: 'image/png' });
		const result = parseForm(pageFormSchema, formData({ ...minimal, visible: 'on', picture: png }));
		expect(result.success && result.data).toMatchObject({ visible: true, picture: png });
	});
});

describe('helpers', () => {
	it('measures the body in UTF-8 bytes, like the TEXT column', () => {
		expect(byteLength('ção')).toBe(5);
		expect(BODY_MAX_BYTES).toBe(65535);
	});

	it('tags the picture like legacy', () => {
		expect(pictureTags('Histórico de Campeões').join(',')).toBe('Histórico,de,Campeões');
	});
});
