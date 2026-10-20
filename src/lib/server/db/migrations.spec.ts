import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const folder = 'drizzle/migrations';

type Journal = { entries: { idx: number; when: number; tag: string }[] };
const journal: Journal = JSON.parse(readFileSync(`${folder}/meta/_journal.json`, 'utf8'));

describe('drizzle migrations', () => {
	it('starts with the baseline', () => {
		expect(journal.entries[0]?.tag).toBe('0000_baseline');
	});

	// drizzle's MySQL migrator only runs migrations newer than the last applied one, so a migration
	// generated on an old branch and merged after a newer one would be skipped silently.
	it('keeps the journal in creation order', () => {
		journal.entries.forEach((entry, index) => {
			expect(entry.idx).toBe(index);
			if (index > 0) expect(entry.when).toBeGreaterThan(journal.entries[index - 1].when);
		});
	});

	it('has one SQL file and snapshot per journal entry', () => {
		const files = readdirSync(folder).filter((file) => file.endsWith('.sql'));
		expect(files.sort()).toEqual(journal.entries.map((entry) => `${entry.tag}.sql`).sort());
		for (const entry of journal.entries) {
			const prefix = String(entry.idx).padStart(4, '0');
			expect(existsSync(`${folder}/meta/${prefix}_snapshot.json`)).toBe(true);
		}
	});
});
