import { describe, expect, it } from 'vitest';
import {
	isUsedByCode,
	missingVariables,
	valueFormSchema,
	variableKind,
	variableNameSchema
} from './form';

describe('variableKind', () => {
	it('knows the variables the legacy code reads', () => {
		expect(variableKind('api_access_token')).toBe('secret');
		expect(variableKind('test_game_id')).toBe('game');
		expect(variableKind('new_site_prompt_yes')).toBe('counter');
		expect(variableKind('social_media.story_match_mvp')).toBe('image');
		expect(variableKind('social_media.anything_new')).toBe('image');
		expect(variableKind('my_note')).toBe('text');
	});
});

describe('isUsedByCode / missingVariables', () => {
	it('protects the names the code reads', () => {
		expect(isUsedByCode('social_media.post_collaborate')).toBe(true);
		expect(isUsedByCode('social_media.anything_new')).toBe(false);
		expect(isUsedByCode('my_note')).toBe(false);
	});

	it('lists the ones without a row', () => {
		const missing = missingVariables(['api_access_token', 'test_game_id']);
		expect(missing).toContain('social_media.story_send_videos');
		expect(missing).not.toContain('api_access_token');
	});
});

describe('variableNameSchema', () => {
	const valid = (name: string) => variableNameSchema.safeParse({ name }).success;

	it('accepts lowercase dotted names', () => {
		expect(valid('social_media.story_x')).toBe(true);
		expect(valid('test_game_id')).toBe(true);
	});

	it('rejects other names', () => {
		for (const name of ['', 'Test', 'a b', 'a..b', '.a', 'new', 'a'.repeat(65)]) {
			expect(valid(name)).toBe(false);
		}
	});
});

describe('valueFormSchema', () => {
	const parse = (kind: Parameters<typeof valueFormSchema>[0], value: string) =>
		valueFormSchema(kind).safeParse({ value });

	it('validates each kind', () => {
		expect(parse('image', 'https://domingoasdez.com/a.png').success).toBe(true);
		expect(parse('image', 'javascript:alert(1)').success).toBe(false);
		expect(parse('game', '7214').success).toBe(true);
		expect(parse('game', 'abc').success).toBe(false);
		expect(parse('counter', '0').success).toBe(true);
		expect(parse('counter', '-1').success).toBe(false);
		expect(parse('secret', 'short').success).toBe(false);
		expect(parse('secret', 'a'.repeat(32)).success).toBe(true);
		expect(parse('text', '').success).toBe(false);
	});
});
