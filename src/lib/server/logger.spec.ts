import { describe, expect, it } from 'vitest';
import { createLogger, type LogFormat, type LoggerOptions, type LogLevel } from './logger';

const NOW = new Date('2026-10-25T10:00:00.000Z');

function recorder(format: LogFormat, options: Partial<LoggerOptions> = {}) {
	const lines: { level: LogLevel; line: string }[] = [];
	const log = createLogger({
		level: 'info',
		format,
		now: () => NOW,
		write: (level, line) => void lines.push({ level, line }),
		...options
	});
	const json = () => lines.map(({ line }) => JSON.parse(line) as Record<string, unknown>);
	return { log, lines, json };
}

describe('createLogger (json)', () => {
	it('writes one object per line with time, level, scope and message first', () => {
		const { log, lines } = recorder('json');
		log.child('clubs').child('club #3').info('saved');
		expect(lines).toEqual([
			{
				level: 'info',
				line: '{"time":"2026-10-25T10:00:00.000Z","level":"info","scope":"clubs:club #3","msg":"saved"}'
			}
		]);
	});

	it('skips entries below the level', () => {
		const { log, lines } = recorder('json', { level: 'warn' });
		log.debug('a');
		log.info('b');
		log.warn('c');
		log.error('d');
		expect(lines.map(({ level }) => level)).toEqual(['warn', 'error']);
	});

	it('turns plain objects into fields, without replacing the parsed keys', () => {
		const { log, json } = recorder('json');
		log.info('deleted', { url: '/storage/a.jpg', count: 2n }, { level: 'nope', msg: 'nope' });
		expect(json()[0]).toEqual({
			time: NOW.toISOString(),
			level: 'info',
			msg: 'deleted',
			url: '/storage/a.jpg',
			count: '2'
		});
	});

	it('serializes the first error with its code, stack and cause', () => {
		const { log, json } = recorder('json');
		const cause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
		log.error('could not save', new Error('Query failed', { cause }), 'extra', 42);

		const [entry] = json();
		expect(entry.error).toMatchObject({
			name: 'Error',
			message: 'Query failed',
			stack: expect.stringContaining('Query failed'),
			cause: { name: 'Error', message: 'connect ECONNREFUSED', code: 'ECONNREFUSED' }
		});
		expect(entry.details).toEqual(['extra', 42]);
	});

	it('adds the context under the entry fields', () => {
		const { log, json } = recorder('json', {
			context: () => ({ requestId: 'r1', userId: 7 })
		});
		log.info('a');
		log.info('b', { userId: 8 });
		expect(json().map(({ requestId, userId }) => ({ requestId, userId }))).toEqual([
			{ requestId: 'r1', userId: 7 },
			{ requestId: 'r1', userId: 8 }
		]);
	});

	it('never throws on cycles or errors inside fields', () => {
		const { log, json } = recorder('json');
		const node: Record<string, unknown> = { name: 'a' };
		node.self = node;
		log.warn('odd', { node, failure: new TypeError('bad') });
		expect(json()[0]).toMatchObject({
			node: { name: 'a', self: '[Circular]' },
			failure: { name: 'TypeError', message: 'bad' }
		});
	});
});

describe('createLogger (text)', () => {
	it('writes readable lines with fields and the error below', () => {
		const { log, lines } = recorder('text');
		log.child('storage').warn('could not delete a file', { url: '/storage/a.jpg', tries: 2 });
		log.info('plain');
		log.error('failed', new Error('boom'));

		expect(lines[0].line).toBe(
			'2026-10-25T10:00:00.000Z WARN [storage] could not delete a file url=/storage/a.jpg tries=2'
		);
		expect(lines[1].line).toBe('2026-10-25T10:00:00.000Z INFO plain');
		expect(lines[2].line).toMatch(/^2026-10-25T10:00:00.000Z ERROR failed\nError: boom\n {4}at /);
	});

	it('leaves out fields without a value, as JSON does', () => {
		const { log, lines } = recorder('text', {
			context: () => ({ requestId: 'r1', userId: undefined })
		});
		log.info('GET /login 200 3ms');
		expect(lines[0].line).toBe('2026-10-25T10:00:00.000Z INFO GET /login 200 3ms requestId=r1');
	});
});
