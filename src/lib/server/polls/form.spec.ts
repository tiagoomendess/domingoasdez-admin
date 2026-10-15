import { describe, expect, it } from 'vitest';
import { createPollSchema, parseAnswers, pollStatus, updatePollSchema } from './form';

const formData = (entries: Record<string, string>) => {
	const data = new FormData();
	for (const [name, value] of Object.entries(entries)) data.append(name, value);
	return data;
};

describe('parseAnswers', () => {
	it('reads the answers in field order, trimmed', () => {
		const result = parseAnswers(
			formData({ answer_2: ' Não ', answer_10: 'Talvez', answer_1: 'Sim' })
		);
		expect(result).toEqual({ answers: ['Sim', 'Não', 'Talvez'], errors: {} });
	});

	it('puts errors on the answer field', () => {
		const { errors } = parseAnswers(
			formData({ answer_1: 'Sim', answer_2: '  ', answer_3: 'x'.repeat(145) })
		);
		expect(Object.keys(errors)).toEqual(['answer_2', 'answer_3']);
	});

	it('needs between 2 and 40 answers', () => {
		expect(parseAnswers(formData({ answer_1: 'Sim' })).errors.answers).toHaveLength(1);
		const many = Object.fromEntries(
			Array.from({ length: 41 }, (_, i) => [`answer_${i + 1}`, `R${i}`])
		);
		expect(parseAnswers(formData(many)).errors.answers).toHaveLength(1);
	});
});

describe('poll schemas', () => {
	const dates = {
		publish_after: '2026-10-15T10:00',
		close_after: '2026-10-18T10:00',
		show_results_after: '2026-10-15T10:00'
	};

	it('accepts the legacy fields', () => {
		expect(createPollSchema.safeParse({ question: 'Quem ganha?', ...dates }).success).toBe(true);
	});

	it('rejects a long question or a bad date', () => {
		expect(createPollSchema.safeParse({ question: 'x'.repeat(145), ...dates }).success).toBe(false);
		expect(
			createPollSchema.safeParse({ question: 'Quem?', ...dates, close_after: '18/10/2026' }).success
		).toBe(false);
	});

	it('lets the update leave out the publish date', () => {
		const result = updatePollSchema.safeParse({
			question: 'Quem?',
			close_after: dates.close_after,
			show_results_after: dates.show_results_after
		});
		expect(result.success && result.data.publish_after).toBeNull();
	});
});

describe('pollStatus', () => {
	const now = new Date('2026-10-15T12:00:00Z');
	const at = (iso: string) => new Date(iso);

	it('follows the dates', () => {
		expect(
			pollStatus(
				{ publishAfter: at('2026-10-16T00:00Z'), closeAfter: at('2026-10-20T00:00Z') },
				now
			)
		).toBe('scheduled');
		expect(
			pollStatus(
				{ publishAfter: at('2026-10-14T00:00Z'), closeAfter: at('2026-10-20T00:00Z') },
				now
			)
		).toBe('open');
		expect(
			pollStatus(
				{ publishAfter: at('2026-10-10T00:00Z'), closeAfter: at('2026-10-12T00:00Z') },
				now
			)
		).toBe('closed');
	});
});
