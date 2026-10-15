import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
	it('matches the slugs the legacy site stored', () => {
		expect(slugify('Clubes Campeões do Popular de Barcelos  1ª Divisão')).toBe(
			'clubes-campeoes-do-popular-de-barcelos-1a-divisao'
		);
		expect(slugify('Desde 1994 (em atualização)')).toBe('desde-1994-em-atualizacao');
		expect(slugify('Revista do Popular 2023.')).toBe('revista-do-popular-2023');
		expect(slugify('!!!')).toBe('');
	});
});
