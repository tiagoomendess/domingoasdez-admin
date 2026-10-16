import { describe, expect, it } from 'vitest';
import {
	canEditGameScore,
	canUseToday,
	hasAdminAccess,
	isResultsOnly,
	resultsOnlyAllows
} from './access';

const user = (permissions: string[], clubIds: number[] = []) => ({ permissions, clubIds });
const game = { homeClubId: 1, awayClubId: 2 };

describe('admin access', () => {
	it('lets in the backoffice and the results-only users', () => {
		expect(hasAdminAccess(user(['dashboard']))).toBe(true);
		expect(hasAdminAccess(user(['score_update']))).toBe(true);
		expect(hasAdminAccess(user([], [5]))).toBe(true);
		expect(hasAdminAccess(user(['articles']))).toBe(false);
	});

	it('keeps results-only users on the results page', () => {
		expect(isResultsOnly(user([], [5]))).toBe(true);
		expect(isResultsOnly(user(['admin']))).toBe(false);
		expect(resultsOnlyAllows('/today')).toBe(true);
		expect(resultsOnlyAllows('/logout')).toBe(true);
		expect(resultsOnlyAllows('/today/reports/12')).toBe(true);
		expect(resultsOnlyAllows('/todayx')).toBe(false);
		expect(resultsOnlyAllows('/')).toBe(false);
		expect(resultsOnlyAllows('/games/1')).toBe(false);
	});
});

describe('scores', () => {
	it('lets score_update and admins edit every game', () => {
		expect(canEditGameScore(user(['score_update']), game)).toBe(true);
		expect(canEditGameScore(user(['admin']), game)).toBe(true);
	});

	it('lets a club admin edit only their clubs’ games', () => {
		expect(canUseToday(user([], [2]))).toBe(true);
		expect(canEditGameScore(user([], [2]), game)).toBe(true);
		expect(canEditGameScore(user([], [3]), game)).toBe(false);
		expect(canEditGameScore(user(['dashboard', 'games.edit']), game)).toBe(false);
	});
});
