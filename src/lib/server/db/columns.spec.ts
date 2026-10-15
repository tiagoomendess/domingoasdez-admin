import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { describe, expect, it } from 'vitest';
import { playgrounds } from './schema';

const db = drizzle.mock();

describe('latLngPoint', () => {
	it('writes POINT(lat lng) like the legacy Playground::toPoint()', () => {
		const query = db
			.update(playgrounds)
			.set({ location: { lat: 41.5058, lng: -8.5432 } })
			.where(eq(playgrounds.id, 1))
			.toSQL();

		expect(query.sql).toContain('`location` = ST_GeomFromText(?)');
		expect(query.params).toContain('POINT(41.5058 -8.5432)');
	});

	it('refuses non-numeric coordinates', () => {
		expect(() =>
			db
				.update(playgrounds)
				.set({ location: { lat: Number.NaN, lng: 0 } })
				.toSQL()
		).toThrow(RangeError);
	});

	it('reads mysql2 geometry ({ x: lat, y: lng })', () => {
		expect(playgrounds.location.mapFromDriverValue({ x: 41.5, y: -8.6 })).toEqual({
			lat: 41.5,
			lng: -8.6
		});
	});
});

describe('timestamps', () => {
	it('fills created_at and updated_at on insert, and updated_at on update', () => {
		const insert = db.insert(playgrounds).values({ name: 'Campo', surface: 'relva' }).toSQL();
		expect(insert.sql).toContain('`created_at`');
		expect(insert.sql).toContain('`updated_at`');

		const update = db
			.update(playgrounds)
			.set({ name: 'Campo 2' })
			.where(eq(playgrounds.id, 1))
			.toSQL();
		expect(update.sql).toContain('`updated_at` = ?');
		expect(update.sql).not.toContain('`created_at`');
	});
});
