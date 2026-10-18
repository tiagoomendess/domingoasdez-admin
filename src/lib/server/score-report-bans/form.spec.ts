import { describe, expect, it } from 'vitest';
import { banMatches, createBanSchema, isActive, targetErrors, updateBanSchema } from './form';

const base = { ban_days: '3', reason: 'Resultado falso', shadow_ban: undefined, ip_ban: undefined };

describe('createBanSchema', () => {
	it('reads a ban', () => {
		const result = createBanSchema.safeParse({
			...base,
			uuid: 'ce63bf64-1ba5-4e2b-9d6a-0123456789ab',
			ip_address: '148.69.45.209',
			ip_ban: 'on'
		});
		expect(result.success && result.data).toMatchObject({
			ban_days: 3,
			user_id: null,
			ip_ban: true,
			shadow_ban: false
		});
	});

	it('checks the legacy limits', () => {
		expect(createBanSchema.safeParse({ ...base, ban_days: '0' }).success).toBe(false);
		expect(createBanSchema.safeParse({ ...base, ban_days: '121' }).success).toBe(false);
		expect(createBanSchema.safeParse({ ...base, reason: 'ab' }).success).toBe(false);
		expect(createBanSchema.safeParse({ ...base, ip_address: '999.1.1.1' }).success).toBe(false);
		expect(createBanSchema.safeParse({ ...base, ip_address: '2001:8a0::1' }).success).toBe(true);
		expect(createBanSchema.safeParse({ ...base, uuid: 'short' }).success).toBe(false);
	});
});

describe('updateBanSchema', () => {
	it('needs a local date and time', () => {
		const ok = { expires_at: '2026-10-20T12:00', reason: 'abc' };
		expect(updateBanSchema.safeParse(ok).success).toBe(true);
		expect(updateBanSchema.safeParse({ ...ok, expires_at: '20/10/2026' }).success).toBe(false);
	});
});

describe('targetErrors', () => {
	const none = { uuid: null, userId: null, ipAddress: null };

	it('needs a device, user or IP', () => {
		expect(targetErrors(none, false)).toHaveProperty('uuid');
		expect(targetErrors({ ...none, userId: 2 }, false)).toEqual({});
	});

	it('needs an IP to ban the whole IP', () => {
		expect(targetErrors({ ...none, userId: 2 }, true)).toHaveProperty('ip_ban');
		expect(targetErrors({ ...none, ipAddress: '1.2.3.4' }, true)).toEqual({});
	});
});

describe('isActive', () => {
	const now = new Date('2026-10-16T12:00:00Z');

	it('is active until it expires', () => {
		expect(isActive(new Date('2026-10-17T00:00:00Z'), now)).toBe(true);
		expect(isActive(new Date('2026-10-16T12:00:00Z'), now)).toBe(false);
		expect(isActive(null, now)).toBe(false);
	});
});

describe('banMatches', () => {
	const sender = { uuid: 'dev-1', userId: 7, ipAddress: '1.2.3.4', userAgent: 'UA' };
	const ban = (values: Partial<typeof sender & { ipBan: boolean }>) => ({
		uuid: null,
		userId: null,
		ipAddress: null,
		userAgent: null,
		ipBan: false,
		...values
	});

	it('matches the same device or user', () => {
		expect(banMatches(ban({ uuid: 'dev-1' }), sender)).toBe(true);
		expect(banMatches(ban({ userId: 7 }), sender)).toBe(true);
	});

	it('matches the IP only when banning the whole IP or the same browser', () => {
		expect(banMatches(ban({ ipAddress: '1.2.3.4', ipBan: true }), sender)).toBe(true);
		expect(banMatches(ban({ ipAddress: '1.2.3.4', userAgent: 'UA' }), sender)).toBe(true);
		expect(banMatches(ban({ ipAddress: '1.2.3.4', userAgent: 'Other' }), sender)).toBe(false);
	});

	it('does not match two signed-out senders by their missing user', () => {
		const anonymous = { ...sender, userId: null, uuid: 'dev-2' };
		expect(banMatches(ban({ ipAddress: '1.2.3.4', userAgent: 'Other' }), anonymous)).toBe(false);
	});
});
