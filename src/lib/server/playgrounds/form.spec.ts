import { describe, expect, it } from 'vitest';
import { parsePlaces } from '#lib/server/geocode.ts';
import { locationOf, playgroundColumns, playgroundFormSchema } from './form';

const valid = { name: 'Campo de Teste', surface: 'Pelado', visible: 'on' };

describe('playgroundFormSchema', () => {
	it('keeps the legacy limits', () => {
		const fails = (extra: Record<string, string>) =>
			!playgroundFormSchema.safeParse({ ...valid, ...extra }).success;
		expect(fails({ width: '1' })).toBe(true);
		expect(fails({ height: '4' })).toBe(true);
		expect(fails({ capacity: '200001' })).toBe(true);
		expect(fails({ priority: '101' })).toBe(true);
		expect(fails({ surface: '' })).toBe(true);
		expect(fails({ latitude: '91' })).toBe(true);
	});

	it('defaults the priority to 0, like legacy', () => {
		expect(playgroundColumns(playgroundFormSchema.parse(valid)).priority).toBe(0);
	});
});

describe('locationOf', () => {
	it('needs both coordinates or none', () => {
		const errors = {};
		expect(locationOf(playgroundFormSchema.parse(valid), errors)).toBeNull();
		expect(
			locationOf(
				playgroundFormSchema.parse({ ...valid, latitude: '41.5', longitude: '-8.6' }),
				errors
			)
		).toEqual({ lat: 41.5, lng: -8.6 });
		const missing: Record<string, string[] | undefined> = {};
		locationOf(playgroundFormSchema.parse({ ...valid, latitude: '41.5' }), missing);
		expect(missing.latitude).toHaveLength(1);
	});
});

describe('parsePlaces', () => {
	it('reads Nominatim results and drops broken ones', () => {
		expect(
			parsePlaces([
				{ display_name: 'Barcelos, Braga', lat: '41.53', lon: '-8.61' },
				{ display_name: 'Sem coordenadas' },
				{ lat: '1', lon: '2' }
			])
		).toEqual([{ label: 'Barcelos, Braga', lat: 41.53, lng: -8.61 }]);
		expect(parsePlaces({ error: 'x' })).toEqual([]);
	});
});
