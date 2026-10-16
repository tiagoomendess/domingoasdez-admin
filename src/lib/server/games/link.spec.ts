import { describe, expect, it } from 'vitest';
import { publicGamePath } from './index';

describe('publicGamePath', () => {
	it('matches the public app link', () => {
		expect(
			publicGamePath({
				seasonName: null,
				competitionName: 'Pré Época',
				startYear: 2026,
				endYear: 2027,
				groupName: '21 a 27 de Setembro',
				round: 3,
				homeClub: 'Águias do Neiva',
				awayClub: 'Andorinhas'
			})
		).toBe('/competicoes/2026-27/pre-epoca/21-a-27-de-setembro/3/aguias-do-neiva-vs-andorinhas');
	});
});
