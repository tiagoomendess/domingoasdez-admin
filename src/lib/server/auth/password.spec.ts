import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
	it('hashes like Laravel ($2y$, cost 10) and verifies the result', async () => {
		const hash = await hashPassword('domingo-as-dez');
		expect(hash).toMatch(/^\$2y\$10\$.{53}$/);
		expect(await verifyPassword('domingo-as-dez', hash)).toBe(true);
	});

	it('accepts $2a$ / $2b$ hashes too', async () => {
		const hash = (await hashPassword('secret')).replace(/^\$2y\$/, '$2b$');
		expect(await verifyPassword('secret', hash)).toBe(true);
	});

	it('rejects wrong passwords, empty input and broken hashes', async () => {
		const hash = await hashPassword('right');
		expect(await verifyPassword('wrong', hash)).toBe(false);
		expect(await verifyPassword('', hash)).toBe(false);
		expect(await verifyPassword('right', null)).toBe(false);
		expect(await verifyPassword('right', 'not-a-bcrypt-hash')).toBe(false);
	});
});
