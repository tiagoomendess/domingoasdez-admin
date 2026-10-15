import { describe, expect, it } from 'vitest';
import { buildAuditEntry, toLegacyValues, truncateBytes, type AuditContext } from './audit-entry';

const context: AuditContext = {
	userId: 7,
	ipAddress: '203.0.113.9',
	ipCountry: 'PT',
	userAgent: 'vitest',
	timezone: 'Europe/Lisbon',
	language: 'pt-PT'
};

describe('toLegacyValues', () => {
	it('uses Eloquent toArray() keys and dates, without secrets', () => {
		expect(
			toLegacyValues({
				id: 1,
				homeTeamId: 3,
				date: new Date('2026-10-14T19:30:00.000Z'),
				password: '$2y$10$hash',
				rememberToken: 'token',
				skipped: undefined
			})
		).toEqual({ id: 1, home_team_id: 3, date: '2026-10-14 19:30:00' });
	});
});

describe('buildAuditEntry', () => {
	it('fills the row like Audit::add()', () => {
		const entry = buildAuditEntry(
			{
				action: 'update',
				model: 'Game',
				oldValues: { id: 5, round: 1 },
				newValues: { id: 5, round: 2 }
			},
			context
		);
		expect(entry).toMatchObject({
			userId: 7,
			action: 'update',
			model: 'Game',
			modelId: 5,
			ipAddress: '203.0.113.9',
			ipCountry: 'PT'
		});
		expect(JSON.parse(entry!.newValues!)).toEqual({ id: 5, round: 2 });
	});

	it('takes the model id from the new values on create', () => {
		const entry = buildAuditEntry(
			{ action: 'create', model: 'Club', newValues: { id: 12 } },
			context
		);
		expect(entry?.modelId).toBe(12);
		expect(entry?.oldValues).toBeNull();
	});

	it('skips updates that changed nothing', () => {
		const values = { id: 1, name: 'Same' };
		expect(
			buildAuditEntry(
				{ action: 'update', model: 'Club', oldValues: values, newValues: { ...values } },
				context
			)
		).toBeNull();
	});

	it('marks unknown origins like the legacy site', () => {
		const entry = buildAuditEntry(
			{ action: 'login', model: 'User', newValues: { id: 1 } },
			{ ...context, ipAddress: null, ipCountry: null }
		);
		expect(entry).toMatchObject({ ipAddress: 'Unknown', ipCountry: 'Unknown' });
	});
});

describe('truncateBytes', () => {
	it('limits by UTF-8 bytes without splitting characters', () => {
		expect(truncateBytes('abc', 10)).toBe('abc');
		expect(truncateBytes('ééé', 5)).toBe('éé');
		expect(truncateBytes('', 5)).toBeNull();
		expect(truncateBytes(null, 5)).toBeNull();
	});
});
