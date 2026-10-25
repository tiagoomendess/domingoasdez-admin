import { inspect } from 'node:util';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * `json`: one JSON object per line, for the log collector (production, docs/logging.md).
 * `text`: readable lines for development.
 */
export type LogFormat = 'json' | 'text';

/**
 * `details` after the message: plain objects become fields (`{ url }`), the first `Error` goes to
 * `error` (name, message, code, stack, cause) and anything else to `details`.
 */
export type Logger = {
	debug(message: string, ...details: unknown[]): void;
	info(message: string, ...details: unknown[]): void;
	warn(message: string, ...details: unknown[]): void;
	error(message: string, ...details: unknown[]): void;
	/** Same level and format, entries tagged with `scope` (`clubs`, `club-birthdays:club #3`). */
	child(scope: string): Logger;
};

export type LoggerOptions = {
	level: LogLevel;
	format: LogFormat;
	scope?: string;
	/** Defaults to stdout (debug, info) and stderr (warn, error), which PM2 collects. */
	write?: (level: LogLevel, line: string) => void;
	now?: () => Date;
	/** Fields added to every entry, under the entry's own (the request being handled). */
	context?: () => Record<string, unknown> | undefined;
};

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_CAUSE_DEPTH = 3;

export function createLogger(options: LoggerOptions): Logger {
	const { level, format, scope, context, write = writeToConsole, now = () => new Date() } = options;

	const log =
		(entryLevel: LogLevel) =>
		(message: string, ...details: unknown[]) => {
			if (ORDER[entryLevel] < ORDER[level]) return;
			const { fields, error, rest } = splitDetails(details);
			const entry = {
				time: now(),
				level: entryLevel,
				scope,
				message,
				fields: { ...context?.(), ...fields },
				error,
				rest
			};
			write(entryLevel, format === 'json' ? jsonLine(entry) : textLine(entry));
		};

	return {
		debug: log('debug'),
		info: log('info'),
		warn: log('warn'),
		error: log('error'),
		child: (child) => createLogger({ ...options, scope: scope ? `${scope}:${child}` : child })
	};
}

type Entry = {
	time: Date;
	level: LogLevel;
	scope: string | undefined;
	message: string;
	fields: Record<string, unknown>;
	error: Error | undefined;
	rest: unknown[];
};

function splitDetails(details: unknown[]): Pick<Entry, 'fields' | 'error' | 'rest'> {
	const fields: Record<string, unknown> = {};
	let error: Error | undefined;
	const rest: unknown[] = [];
	for (const detail of details) {
		if (detail instanceof Error && !error) error = detail;
		else if (isPlainObject(detail)) Object.assign(fields, detail);
		else rest.push(detail);
	}
	return { fields, error, rest };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function jsonLine({ time, level, scope, message, fields, error, rest }: Entry): string {
	const record: Record<string, unknown> = { time: time.toISOString(), level };
	if (scope) record.scope = scope;
	record.msg = message;
	// Fields never replace the keys above, which the collector parses.
	for (const [key, value] of Object.entries(fields)) if (!(key in record)) record[key] = value;
	if (error) record.error = serializeError(error);
	if (rest.length > 0) record.details = rest;
	return safeStringify(record);
}

function textLine({ time, level, scope, message, fields, error, rest }: Entry): string {
	const pairs = Object.entries(fields)
		.filter(([, value]) => value !== undefined)
		.map(
			([key, value]) =>
				`${key}=${typeof value === 'string' ? value : inspect(value, { breakLength: Infinity })}`
		);
	const head = [`${time.toISOString()} ${level.toUpperCase()}`, scope && `[${scope}]`, message]
		.concat(pairs)
		.filter(Boolean)
		.join(' ');
	const extras = error ? [error, ...rest] : rest;
	return [head, ...extras.map((extra) => inspect(extra, { depth: 4 }))].join('\n');
}

type SerializedError = {
	name: string;
	message: string;
	code?: string | number;
	stack?: string;
	cause?: unknown;
};

function serializeError(error: Error, depth = 0): SerializedError {
	const serialized: SerializedError = { name: error.name, message: error.message };
	// mysql2 (ER_DUP_ENTRY), Node (ECONNREFUSED) and the AWS SDK set `code`.
	const code = (error as { code?: unknown }).code;
	if (typeof code === 'string' || typeof code === 'number') serialized.code = code;
	if (error.stack) serialized.stack = error.stack;
	if (error.cause !== undefined) {
		serialized.cause =
			error.cause instanceof Error && depth < MAX_CAUSE_DEPTH
				? serializeError(error.cause, depth + 1)
				: error.cause;
	}
	return serialized;
}

/** `JSON.stringify` that never throws: BigInts as strings, nested errors serialized, cycles cut. */
function safeStringify(value: unknown): string {
	const seen = new WeakSet<object>();
	return JSON.stringify(value, (_key, item: unknown) => {
		if (typeof item === 'bigint') return item.toString();
		if (item instanceof Error) return serializeError(item);
		if (typeof item === 'object' && item !== null) {
			if (seen.has(item)) return '[Circular]';
			seen.add(item);
		}
		return item;
	});
}

function writeToConsole(level: LogLevel, line: string) {
	if (ORDER[level] >= ORDER.warn) console.error(line);
	else console.log(line);
}
