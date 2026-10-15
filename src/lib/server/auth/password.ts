import { compare, hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

/** Verify a password against a Laravel bcrypt hash (`$2y$` / `$2a$` / `$2b$`). */
export async function verifyPassword(password: string, hashValue: string | null | undefined) {
	if (!password || !hashValue) return false;
	const normalized = hashValue.startsWith('$2y$') ? `$2a$${hashValue.slice(4)}` : hashValue;
	try {
		return await compare(password, normalized);
	} catch {
		return false;
	}
}

/** Hash a password as Laravel does (bcrypt cost 10, `$2y$` prefix) so the legacy site accepts it. */
export async function hashPassword(password: string): Promise<string> {
	const hashed = await hash(password, BCRYPT_ROUNDS);
	return hashed.startsWith('$2a$') || hashed.startsWith('$2b$') ? `$2y$${hashed.slice(4)}` : hashed;
}
