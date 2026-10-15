/**
 * `<input type="datetime-local">` values (`YYYY-MM-DDTHH:mm`) in the admin's timezone ↔ the UTC
 * instants the database stores.
 */

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export const isLocalDateTime = (value: string) => LOCAL_INPUT.test(value);

/** Wall-clock parts of `date` in `timeZone`. */
function wallClock(date: Date, timeZone: string) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
			.formatToParts(date)
			.map((part) => [part.type, part.value])
	);
	return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>;
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds. */
function offsetAt(date: Date, timeZone: string): number {
	const p = wallClock(date, timeZone);
	const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
	return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant → `datetime-local` value in `timeZone`. */
export function toLocalInput(date: Date, timeZone: string): string {
	const p = wallClock(date, timeZone);
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * `datetime-local` value read in `timeZone` → UTC instant, or `null` when it is not a valid
 * date. A time skipped by a DST change moves forward by the gap, like Carbon does.
 */
export function fromLocalInput(value: string, timeZone: string): Date | null {
	const match = LOCAL_INPUT.exec(value);
	if (!match) return null;
	const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
	const wall = Date.UTC(year, month - 1, day, hour, minute);
	const check = new Date(wall);
	if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23) return null;

	// The offset depends on the instant: guess with the offset at the wall time, then correct.
	let instant = wall - offsetAt(new Date(wall), timeZone);
	instant = wall - offsetAt(new Date(instant), timeZone);
	return new Date(instant);
}
