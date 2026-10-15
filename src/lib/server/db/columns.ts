import { sql } from 'drizzle-orm';
import { customType, timestamp } from 'drizzle-orm/mysql-core';

/**
 * Eloquent fills `created_at` / `updated_at` on every save. Drizzle does the same through
 * `$defaultFn` (insert) and `$onUpdateFn` (update), so writes stay compatible with Laravel.
 *
 * TIMESTAMP values are naive UTC (Laravel app timezone is UTC). With `dateStrings: true` on the
 * pool, Drizzle reads them as UTC and writes Dates back as UTC.
 */
export const timestamps = {
	createdAt: timestamp('created_at').$defaultFn(() => new Date()),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date())
};

export type LatLng = { lat: number; lng: number };

/**
 * Legacy MySQL `POINT` column. Laravel writes `ST_GeomFromText('POINT(lat lng)')` with SRID 0,
 * so X is the **latitude** and Y the longitude (the reverse of GeoJSON / WKT convention).
 * mysql2 decodes geometry values as `{ x, y }`.
 *
 * Only select it at the top level of a query: nested relational `with` results are JSON
 * aggregates, which do not carry geometry values.
 */
export const latLngPoint = customType<{
	data: LatLng;
	driverData: { x: number; y: number };
}>({
	dataType() {
		return 'point';
	},
	fromDriver(value) {
		return { lat: value.x, lng: value.y };
	},
	toDriver(value) {
		if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) {
			throw new RangeError('Latitude and longitude must be finite numbers');
		}
		return sql`ST_GeomFromText(${`POINT(${value.lat} ${value.lng})`})`;
	}
});
