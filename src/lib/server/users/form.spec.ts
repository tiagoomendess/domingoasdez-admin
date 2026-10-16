import { describe, expect, it } from 'vitest';
import { banFormSchema, canGrant, profileFormSchema } from './form';

describe('canGrant', () => {
	it('lets an admin grant anything', () => {
		expect(canGrant(['admin'], 'admin')).toBe(true);
		expect(canGrant(['admin'], 'players.edit')).toBe(true);
	});

	it('lets others grant only what they hold, never admin', () => {
		expect(canGrant(['users.edit', 'players'], 'players')).toBe(true);
		expect(canGrant(['users.edit', 'players'], 'players.edit')).toBe(false);
		expect(canGrant(['users.edit', 'admin.fake'], 'admin')).toBe(false);
	});
});

describe('profileFormSchema', () => {
	it('requires the picture and keeps the legacy limits', () => {
		expect(profileFormSchema.safeParse({ picture: '' }).success).toBe(false);
		expect(
			profileFormSchema.safeParse({ picture: '/storage/a.jpg', phone: '123456789012345' }).success
		).toBe(false);
		const ok = profileFormSchema.parse({ picture: '/storage/a.jpg', phone: '', bio: '' });
		expect(ok).toEqual({ picture: '/storage/a.jpg', phone: null, bio: null });
	});
});

describe('banFormSchema', () => {
	it('needs a 3 to 155 character reason', () => {
		expect(banFormSchema.safeParse({ reason: 'ok' }).success).toBe(false);
		expect(banFormSchema.safeParse({ reason: 'x'.repeat(156) }).success).toBe(false);
		expect(banFormSchema.safeParse({ reason: 'Spam nos comentários' }).success).toBe(true);
	});
});
