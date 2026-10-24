import { describe, expect, it } from 'vitest';
import { phpWordwrap } from './wordwrap.ts';

// Expected values: PHP 7.4 `explode("\n", wordwrap($text, 36))` in the legacy container.
const cases: [string, string[]][] = [
	[
		'Quem é o jogador revelação da 2ª Divisão do Futebol Popular?',
		['Quem é o jogador revelação da 2ª', 'Divisão do Futebol Popular?']
	],
	[
		'Qual o “Clube mais recente  a competir atualmente no Popular”',
		['Qual o “Clube mais recente  a', 'competir atualmente no Popular”']
	],
	['Que Formato preferes', ['Que Formato preferes']],
	['Como preferes o site do Domingo às Dez?', ['Como preferes o site do Domingo às', 'Dez?']],
	[
		'Supercalifragilisticexpialidocious-palavra-enorme-sem-espacos curta',
		['Supercalifragilisticexpialidocious-palavra-enorme-sem-espacos', 'curta']
	],
	[
		'Linha um\ncom quebra que é bastante comprida para partir aqui',
		['Linha um', 'com quebra que é bastante comprida', 'para partir aqui']
	],
	['     espaços no início e no fim     ', ['     espaços no início e no fim   ', ' ']]
];

describe('phpWordwrap', () => {
	it.each(cases)('wraps %j like PHP', (text, lines) => {
		expect(phpWordwrap(text, 36)).toEqual(lines);
	});
});
