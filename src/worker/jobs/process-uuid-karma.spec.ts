import { describe, expect, it } from 'vitest';
import { karmaDeltas, type KarmaReport } from './process-uuid-karma.rules.ts';

const report = (overrides: Partial<KarmaReport>): KarmaReport => ({
	uuid: 'device-a',
	homeScore: 2,
	awayScore: 1,
	finished: false,
	isCorrect: false,
	isFake: false,
	gameScore: { home: 2, away: 1 },
	...overrides
});

describe('karmaDeltas', () => {
	it('gives +3 for a finished report with the final score', () => {
		expect(karmaDeltas([report({ finished: true })])).toEqual(new Map([['device-a', 3]]));
	});

	it('gives nothing for a finished report with another score', () => {
		expect(karmaDeltas([report({ finished: true, awayScore: 2 })])).toEqual(new Map());
	});

	it('gives +1 for an unfinished report marked correct', () => {
		expect(karmaDeltas([report({ isCorrect: true })])).toEqual(new Map([['device-a', 1]]));
	});

	it('does not give the correct bonus to finished reports', () => {
		expect(karmaDeltas([report({ finished: true, isCorrect: true, awayScore: 0 })])).toEqual(
			new Map()
		);
	});

	it('takes 1 for a fake report, also when it is finished with the right score', () => {
		expect(karmaDeltas([report({ isFake: true })])).toEqual(new Map([['device-a', -1]]));
		expect(karmaDeltas([report({ finished: true, isFake: true })])).toEqual(
			new Map([['device-a', 2]])
		);
	});

	it('sums the reports of a device and keeps a device whose passes cancel out', () => {
		const deltas = karmaDeltas([
			report({ finished: true }),
			report({ isCorrect: true }),
			report({ uuid: 'device-b', isCorrect: true }),
			report({ uuid: 'device-b', isFake: true })
		]);
		expect(deltas).toEqual(
			new Map([
				['device-a', 4],
				['device-b', 0]
			])
		);
	});

	it('skips reports without a device or with a device id too long to store', () => {
		expect(
			karmaDeltas([
				report({ uuid: null, finished: true }),
				report({ uuid: '', isFake: true }),
				report({ uuid: 'x'.repeat(37), isFake: true })
			])
		).toEqual(new Map());
	});
});
