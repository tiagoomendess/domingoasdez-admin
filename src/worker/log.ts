export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
	debug(message: string, ...details: unknown[]): void;
	info(message: string, ...details: unknown[]): void;
	warn(message: string, ...details: unknown[]): void;
	error(message: string, ...details: unknown[]): void;
	/** Same level, messages prefixed with `[scope]` (the job name). */
	child(scope: string): Logger;
};

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** One line per event on stdout/stderr, which PM2 collects (`pm2 logs domingoasdez-admin-worker`). */
export function createLogger(level: LogLevel, scope?: string): Logger {
	const write =
		(messageLevel: LogLevel) =>
		(message: string, ...details: unknown[]) => {
			if (ORDER[messageLevel] < ORDER[level]) return;
			const line = `${new Date().toISOString()} ${messageLevel.toUpperCase()} ${scope ? `[${scope}] ` : ''}${message}`;
			if (ORDER[messageLevel] >= ORDER.warn) console.error(line, ...details);
			else console.log(line, ...details);
		};

	return {
		debug: write('debug'),
		info: write('info'),
		warn: write('warn'),
		error: write('error'),
		child: (child) => createLogger(level, scope ? `${scope}:${child}` : child)
	};
}
