import { describe, expect, it } from 'vitest';
import { parseCode, sourceUrl, statusFormSchema } from './form';

describe('statusFormSchema', () => {
	it('accepts the statuses an admin sets', () => {
		for (const status of ['sent', 'seen', 'used', 'archived']) {
			expect(statusFormSchema.safeParse({ status }).success).toBe(true);
		}
	});

	it('leaves deleted to the author', () => {
		expect(statusFormSchema.safeParse({ status: 'deleted' }).success).toBe(false);
		expect(statusFormSchema.safeParse({ status: '' }).success).toBe(false);
	});
});

describe('parseCode', () => {
	it('reads a code in any case', () => {
		expect(parseCode(' umz36rmqt ')).toBe('UMZ36RMQT');
		expect(parseCode('#BTFJ3VWRR')).toBe('BTFJ3VWRR');
	});

	it('ignores other text', () => {
		expect(parseCode('golo')).toBeNull();
		expect(parseCode('jogo de ontem')).toBeNull();
		expect(parseCode('UMZ36RMQTX')).toBeNull();
	});
});

describe('sourceUrl', () => {
	it('links web addresses', () => {
		expect(sourceUrl('https://facebook.com/post/1')).toBe('https://facebook.com/post/1');
		expect(sourceUrl(' http://example.com ')).toBe('http://example.com/');
	});

	it('leaves other text alone', () => {
		expect(sourceUrl('Facebook do clube')).toBeNull();
		expect(sourceUrl('javascript:alert(1)')).toBeNull();
		expect(sourceUrl('https://a.pt e mais')).toBeNull();
	});
});
