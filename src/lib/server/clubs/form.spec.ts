import { describe, expect, it } from 'vitest';
import { parseForm } from '#lib/server/forms.ts';
import { clubColumns, clubFormSchema, EMBLEM_MAX_BYTES, emblemTags } from './form';

function formData(entries: Record<string, string | File>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.append(key, value);
	return data;
}

/** What the browser sends for the club form with nothing but the required fields. */
const minimal = { name: 'GD Exemplo', priority: '1', emblem: new File([], '') };

describe('clubFormSchema', () => {
	it('accepts the minimal form and maps it to columns', () => {
		const result = parseForm(clubFormSchema, formData(minimal));
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.emblem).toBeNull();
		expect(clubColumns(result.data)).toEqual({
			name: 'GD Exemplo',
			foundingDate: null,
			birthdayPostEnabled: false,
			website: null,
			contactEmail: null,
			adminUserId: null,
			priority: 1,
			notificationsEnabled: false,
			visible: false
		});
	});

	it('reads every field', () => {
		const result = parseForm(
			clubFormSchema,
			formData({
				...minimal,
				name: '  GD Exemplo  ',
				founding_date: '1948-05-01',
				website: 'https://gdexemplo.pt',
				contact_email: 'geral@gdexemplo.pt',
				admin_user_id: '42',
				priority: '100',
				visible: 'on',
				notifications_enabled: 'on',
				birthday_post_enabled: 'on'
			})
		);
		expect(result.success && clubColumns(result.data)).toEqual({
			name: 'GD Exemplo',
			foundingDate: '1948-05-01',
			birthdayPostEnabled: true,
			website: 'https://gdexemplo.pt',
			contactEmail: 'geral@gdexemplo.pt',
			adminUserId: 42,
			priority: 100,
			notificationsEnabled: true,
			visible: true
		});
	});

	it('applies the legacy rules', () => {
		const result = parseForm(
			clubFormSchema,
			formData({
				name: 'x'.repeat(156),
				priority: '101',
				founding_date: 'ontem',
				website: 'gdexemplo',
				contact_email: 'geral',
				admin_user_id: 'abc',
				emblem: new File([new Uint8Array(10)], 'emblem.jpg', { type: 'image/jpeg' })
			})
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(Object.keys(result.errors).sort()).toEqual([
			'admin_user_id',
			'contact_email',
			'emblem',
			'founding_date',
			'name',
			'priority',
			'website'
		]);
		// Text values come back to refill the form; files do not.
		expect(result.values).toMatchObject({ priority: '101', website: 'gdexemplo' });
		expect(result.values).not.toHaveProperty('emblem');
	});

	it('requires the name and the priority', () => {
		const result = parseForm(clubFormSchema, formData({ name: ' ', priority: '' }));
		expect(!result.success && result.errors).toMatchObject({
			name: ['Campo obrigatório.'],
			priority: ['Campo obrigatório.']
		});
	});

	it('limits the emblem to 1000 KB of PNG or SVG', () => {
		const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'e.svg', {
			type: 'image/svg+xml'
		});
		const ok = parseForm(clubFormSchema, formData({ ...minimal, emblem: svg }));
		expect(ok.success && ok.data.emblem).toBe(svg);

		const big = new File([new Uint8Array(EMBLEM_MAX_BYTES + 1)], 'e.png', { type: 'image/png' });
		const tooBig = parseForm(clubFormSchema, formData({ ...minimal, emblem: big }));
		expect(!tooBig.success && tooBig.errors.emblem).toEqual([
			'O ficheiro não pode ter mais de 1000 KB.'
		]);
	});
});

describe('emblemTags', () => {
	it('uses the legacy media library tags', () => {
		expect(emblemTags('GD Exemplo').join(',')).toBe('Emblema,Clube,GD Exemplo');
	});
});
