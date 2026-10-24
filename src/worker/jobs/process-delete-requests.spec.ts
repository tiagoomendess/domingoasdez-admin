import { describe, expect, it } from 'vitest';
import { requestAction } from './process-delete-requests.rules.ts';

describe('requestAction', () => {
	it('closes cancelled requests, confirmed or not', () => {
		expect(requestAction({ cancelled: true, verified: false })).toBe('close');
		expect(requestAction({ cancelled: true, verified: true })).toBe('close');
	});

	it('deletes confirmed requests', () => {
		expect(requestAction({ cancelled: false, verified: true })).toBe('delete');
	});

	it('leaves unconfirmed requests pending', () => {
		expect(requestAction({ cancelled: false, verified: false })).toBe('wait');
	});
});
