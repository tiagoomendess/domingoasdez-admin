import { describe, expect, it } from 'vitest';
import { requestEntry, type RequestSummary } from './request-log';

const request: RequestSummary = {
	requestId: 'r1',
	method: 'GET',
	path: '/clubs/12',
	route: '/clubs/[id=id]',
	status: 200,
	durationMs: 34,
	userId: 7
};

describe('requestEntry', () => {
	it('logs requests at info level with the summary as fields', () => {
		expect(requestEntry(request)).toEqual({
			level: 'info',
			message: 'GET /clubs/12 200 34ms',
			fields: request
		});
		expect(requestEntry({ ...request, status: 303 }).level).toBe('info');
		expect(requestEntry({ ...request, status: 404, route: null }).level).toBe('info');
	});

	it('logs server errors at error level', () => {
		expect(requestEntry({ ...request, status: 500 }).level).toBe('error');
		expect(requestEntry({ ...request, route: '/healthz', status: 503 }).level).toBe('error');
	});

	it('keeps the uptime checks at debug level', () => {
		expect(requestEntry({ ...request, path: '/healthz', route: '/healthz' }).level).toBe('debug');
	});
});
