import { describe, expect, it } from 'vitest';
import { parseForm } from '#lib/server/forms.ts';
import {
	articleDate,
	articleDateValue,
	articleFormSchema,
	bodyImageTags,
	cleanTags,
	cleanTitle,
	coverTags,
	IMAGE_MAX_BYTES,
	TEXT_MAX_LENGTH
} from './form';

function formData(entries: Record<string, string | File>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.append(key, value);
	return data;
}

const minimal = { title: 'Final da Taça', text: '<p>Texto</p>', cover: new File([], '') };

describe('articleFormSchema', () => {
	it('accepts the minimal form', () => {
		const result = parseForm(articleFormSchema, formData(minimal));
		expect(result.success && result.data).toEqual({
			title: 'Final da Taça',
			description: null,
			media_id: null,
			cover: null,
			text: '<p>Texto</p>',
			date: null,
			tags: null,
			visible: false
		});
	});

	it('reads every field', () => {
		const result = parseForm(
			articleFormSchema,
			formData({
				...minimal,
				description: ' Resumo ',
				media_id: '5729',
				date: '2026-09-01',
				tags: 'Taça, Final',
				visible: 'on'
			})
		);
		expect(result.success && result.data).toMatchObject({
			description: 'Resumo',
			media_id: 5729,
			date: '2026-09-01',
			tags: 'Taça, Final',
			visible: true
		});
	});

	it('applies the legacy limits', () => {
		const result = parseForm(
			articleFormSchema,
			formData({
				title: 'x'.repeat(156),
				description: 'x'.repeat(281),
				text: 'x'.repeat(TEXT_MAX_LENGTH + 1),
				tags: 'x'.repeat(281),
				date: 'ontem',
				media_id: 'abc',
				cover: new File([new Uint8Array(IMAGE_MAX_BYTES + 1)], 'capa.png', { type: 'image/png' })
			})
		);
		expect(!result.success && Object.keys(result.errors).sort()).toEqual([
			'cover',
			'date',
			'description',
			'media_id',
			'tags',
			'text',
			'title'
		]);
	});

	it('requires the title and the text', () => {
		const result = parseForm(articleFormSchema, formData({ title: ' ', text: '' }));
		expect(!result.success && result.errors).toMatchObject({
			title: ['Campo obrigatório.'],
			text: ['Campo obrigatório.']
		});
	});

	it('only takes JPEG or PNG covers', () => {
		const gif = new File([new Uint8Array(4)], 'capa.gif', { type: 'image/gif' });
		const result = parseForm(articleFormSchema, formData({ ...minimal, cover: gif }));
		expect(!result.success && result.errors.cover).toEqual([
			'Formato não suportado. Use JPEG, PNG.'
		]);
	});
});

describe('legacy clean-ups', () => {
	it('drops one trailing . ! or ?', () => {
		expect(cleanTitle('Vitória!')).toBe('Vitória');
		expect(cleanTitle('Quem ganha??')).toBe('Quem ganha?');
		expect(cleanTitle('Sem pontuação')).toBe('Sem pontuação');
	});

	it('normalises tags like legacy', () => {
		expect(cleanTags('Taça, Final,Barcelos')).toBe('Taça,Final,Barcelos');
		expect(cleanTags(null)).toBe('');
	});

	it('stores the date as midnight UTC and reads it back', () => {
		expect(articleDate('2026-09-01').toISOString()).toBe('2026-09-01T00:00:00.000Z');
		expect(articleDateValue(articleDate('2026-09-01'))).toBe('2026-09-01');
	});

	it('tags uploaded pictures for the media library', () => {
		expect(coverTags({ title: 'Final da Taça!', tags: 'Taça, Final' })).toEqual([
			'Taça',
			'Final',
			'Final da Taça'
		]);
		expect(bodyImageTags('foto, final.jpg').join(',')).toBe('ckeditor-upload,foto  final.jpg');
	});
});
