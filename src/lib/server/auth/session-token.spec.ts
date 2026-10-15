import { describe, expect, it } from 'vitest';
import {
	passwordFingerprint,
	signSession,
	verifySession,
	type SessionPayload
} from './session-token';

const SECRET = 'test-secret-that-is-at-least-32-characters';
const NOW = 1_800_000_000;
const payload: SessionPayload = { u: 42, e: NOW + 3600, p: 'fingerprint', r: false };

describe('session tokens', () => {
	it('round-trips a valid token', async () => {
		const token = await signSession(payload, SECRET);
		expect(await verifySession(token, SECRET, NOW)).toEqual(payload);
	});

	it('rejects a tampered payload or signature', async () => {
		const token = await signSession(payload, SECRET);
		const [body, signature] = token.split('.');
		const forgedBody = Buffer.from(JSON.stringify({ ...payload, u: 1 })).toString('base64url');

		expect(await verifySession(`${forgedBody}.${signature}`, SECRET, NOW)).toBeNull();
		expect(await verifySession(`${body}.${signature.slice(0, -2)}xx`, SECRET, NOW)).toBeNull();
	});

	it('rejects tokens signed with another secret', async () => {
		const token = await signSession(payload, `${SECRET}-other`);
		expect(await verifySession(token, SECRET, NOW)).toBeNull();
	});

	it('rejects expired and malformed tokens', async () => {
		const token = await signSession({ ...payload, e: NOW - 1 }, SECRET);
		expect(await verifySession(token, SECRET, NOW)).toBeNull();
		expect(await verifySession(undefined, SECRET, NOW)).toBeNull();
		expect(await verifySession('garbage', SECRET, NOW)).toBeNull();
		expect(await verifySession('a.b.c', SECRET, NOW)).toBeNull();
	});

	it('fingerprints password hashes so a password change revokes sessions', async () => {
		const before = await passwordFingerprint('$2y$10$abc');
		const after = await passwordFingerprint('$2y$10$xyz');
		expect(before).toHaveLength(16);
		expect(before).not.toBe(after);
		expect(before).not.toContain('abc');
		expect(await passwordFingerprint(null)).toBe('');
	});
});
