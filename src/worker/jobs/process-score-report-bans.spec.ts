import { describe, expect, it } from 'vitest';
import {
	banKey,
	banReason,
	banTarget,
	isFakeReport,
	karmaUuid,
	nextKarma
} from './process-score-report-bans.rules.ts';

const report = (homeScore: number, awayScore: number, isFake = false) => ({
	homeScore,
	awayScore,
	isFake,
	gameScore: { home: 2, away: 1 }
});

describe('isFakeReport', () => {
	it('flags reports above the final score or marked fake', () => {
		expect(isFakeReport(report(3, 1))).toBe(true);
		expect(isFakeReport(report(2, 2))).toBe(true);
		expect(isFakeReport(report(2, 1, true))).toBe(true);
	});

	it('accepts the final score and lower (earlier) scores', () => {
		expect(isFakeReport(report(2, 1))).toBe(false);
		expect(isFakeReport(report(1, 0))).toBe(false);
		expect(isFakeReport(report(0, 1))).toBe(false);
	});
});

describe('banTarget', () => {
	it('cuts values to the legacy limits', () => {
		const target = banTarget({
			uuid: 'u'.repeat(40),
			userId: 7,
			ipAddress: '1'.repeat(45),
			userAgent: 'a'.repeat(300)
		});
		expect(target).toEqual({
			uuid: 'u'.repeat(36),
			userId: 7,
			ipAddress: '1'.repeat(40),
			userAgent: 'a'.repeat(255)
		});
	});

	it('stores empty values as null', () => {
		expect(banTarget({ uuid: '', userId: null, ipAddress: null, userAgent: '' })).toEqual({
			uuid: null,
			userId: null,
			ipAddress: null,
			userAgent: null
		});
	});
});

describe('banKey', () => {
	it('joins user, IP and device like legacy', () => {
		expect(banKey({ userId: 7, ipAddress: '1.2.3.4', uuid: 'abc' })).toBe('7_1.2.3.4_abc');
		expect(banKey({ userId: null, ipAddress: '1.2.3.4', uuid: null })).toBe('_1.2.3.4_');
	});
});

describe('banReason', () => {
	it('names the game, within 255 characters', () => {
		expect(banReason('A vs B')).toBe('Envio de um resultado falso no jogo A vs B');
		expect(banReason('x'.repeat(300))).toHaveLength(255);
	});
});

describe('nextKarma', () => {
	it('flips to -1, then takes 3 per ban', () => {
		expect(nextKarma(null)).toBe(-1);
		expect(nextKarma(0)).toBe(-1);
		expect(nextKarma(12)).toBe(-1);
		expect(nextKarma(-1)).toBe(-4);
		expect(nextKarma(-4)).toBe(-7);
	});
});

describe('karmaUuid', () => {
	it('skips missing and too long device ids', () => {
		expect(karmaUuid('abc')).toBe('abc');
		expect(karmaUuid(null)).toBeNull();
		expect(karmaUuid('x'.repeat(37))).toBeNull();
	});
});
