import type { Logger } from '#lib/server/logger.ts';

/** A logger that records `level: [scope] message` lines instead of printing them. */
export function recordingLogger(
	lines: string[] = [],
	scope?: string
): Logger & { lines: string[] } {
	const write = (level: string) => (message: string) =>
		void lines.push(`${level}: ${scope ? `[${scope}] ` : ''}${message}`);
	return {
		lines,
		debug: write('debug'),
		info: write('info'),
		warn: write('warn'),
		error: write('error'),
		child: (child) => recordingLogger(lines, child)
	};
}
