import { describe, expect, it } from 'vitest';
import { parseForm } from '#lib/server/forms.ts';
import { teamColumns, teamFormSchema } from './form';

function formData(entries: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(entries)) data.append(key, value);
	return data;
}

describe('teamFormSchema', () => {
	it('maps the form to columns', () => {
		const result = parseForm(
			teamFormSchema,
			formData({ name: ' Seniores ', club_id: '7', contact_email: '', visible: 'on' })
		);
		expect(result.success && teamColumns(result.data)).toEqual({
			name: 'Seniores',
			clubId: 7,
			contactEmail: null,
			visible: true
		});
	});

	it('requires the club and the name, like the legacy controller', () => {
		const result = parseForm(teamFormSchema, formData({ name: '', club_id: '' }));
		expect(!result.success && result.errors).toEqual({
			name: ['Campo obrigatório.'],
			club_id: ['Campo obrigatório.']
		});
	});

	it('validates the contact email and the name length', () => {
		const result = parseForm(
			teamFormSchema,
			formData({ name: 'x'.repeat(156), club_id: '7', contact_email: 'nope' })
		);
		expect(!result.success && result.errors).toEqual({
			name: ['Máximo de 155 caracteres.'],
			contact_email: ['Endereço de email inválido.']
		});
	});
});
