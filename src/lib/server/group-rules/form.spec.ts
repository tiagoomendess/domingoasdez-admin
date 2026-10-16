import { describe, expect, it } from 'vitest';
import { AFPB_SCRIPT, parsePositions, ruleFormSchema, scriptFor, tieBreakerOf } from './form';

const formData = (entries: Record<string, string>) => {
	const data = new FormData();
	for (const [name, value] of Object.entries(entries)) data.append(name, value);
	return data;
};

describe('parsePositions', () => {
	it('reads the bands in order and normalises the positions', () => {
		const { rows, errors } = parsePositions(
			formData({
				positions_1: '5, 6,7',
				color_1: '#F3A4A4',
				label_1: 'Despromoção',
				positions_0: '1,2',
				color_0: '#99d98b',
				label_0: 'Apuramento'
			})
		);
		expect(errors).toEqual({});
		expect(rows).toEqual([
			{ positions: '1,2', color: '#99d98b', label: 'Apuramento' },
			{ positions: '5,6,7', color: '#f3a4a4', label: 'Despromoção' }
		]);
	});

	it('ignores empty rows but flags partly filled ones', () => {
		const { rows, errors } = parsePositions(
			formData({
				positions_0: '',
				color_0: '#000000',
				label_0: '',
				positions_1: '1',
				color_1: '#000000',
				label_1: ''
			})
		);
		expect(rows).toHaveLength(1);
		expect(Object.keys(errors)).toEqual(['label_1']);
	});

	it('rejects a bad list, a bad colour and a position in two bands', () => {
		const { errors } = parsePositions(
			formData({
				positions_0: '1-3',
				color_0: 'green',
				label_0: 'A',
				positions_1: '4,5',
				color_1: '#000000',
				label_1: 'B',
				positions_2: '5',
				color_2: '#ffffff',
				label_2: 'C'
			})
		);
		expect(Object.keys(errors).sort()).toEqual(['color_0', 'positions_0', 'positions_2']);
	});
});

describe('tie-breaker', () => {
	it('recognises the stored scripts', () => {
		expect(tieBreakerOf(null)).toBe('none');
		expect(tieBreakerOf('  ')).toBe('none');
		expect(tieBreakerOf('return afpb_points_2018(table,group,round);')).toBe('afpb');
		expect(tieBreakerOf('return custom(table);')).toBe('custom');
	});

	it('stores the script of the choice', () => {
		const base = { name: 'x', type: 'points', promotes: '0', relegates: '0' };
		expect(scriptFor(ruleFormSchema.parse({ ...base, tie_breaker: 'afpb' }))).toBe(AFPB_SCRIPT);
		expect(
			scriptFor(ruleFormSchema.parse({ ...base, tie_breaker: 'none', tie_breaker_script: 'x' }))
		).toBeNull();
		expect(
			scriptFor(
				ruleFormSchema.parse({ ...base, tie_breaker: 'custom', tie_breaker_script: 'f();' })
			)
		).toBe('f();');
	});
});
