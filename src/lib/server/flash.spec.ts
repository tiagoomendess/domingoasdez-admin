import { describe, expect, it } from 'vitest';
import { parseFlash } from './flash';

describe('parseFlash', () => {
	it('reads a stored message', () => {
		expect(parseFlash('{"type":"success","message":"Clube guardado."}')).toEqual({
			type: 'success',
			message: 'Clube guardado.'
		});
	});

	it('ignores anything else', () => {
		expect(parseFlash('not json')).toBeNull();
		expect(parseFlash('"text"')).toBeNull();
		expect(parseFlash('{"type":"info","message":"x"}')).toBeNull();
		expect(parseFlash('{"type":"error","message":""}')).toBeNull();
		expect(parseFlash('{"type":"error","message":42}')).toBeNull();
	});

	it('caps the length', () => {
		const flash = parseFlash(JSON.stringify({ type: 'error', message: 'x'.repeat(1000) }));
		expect(flash?.message).toHaveLength(300);
	});
});
