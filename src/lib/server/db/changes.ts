/**
 * Eloquent only writes the attributes that changed, and skips the UPDATE (and `updated_at`)
 * when nothing did. `changedColumns()` gives the admin the same behaviour.
 */

function sameValue(a: unknown, b: unknown): boolean {
	if (a instanceof Date || b instanceof Date) {
		const time = (value: unknown) =>
			value instanceof Date
				? value.getTime()
				: value == null
					? null
					: new Date(String(value)).getTime();
		return time(a) === time(b);
	}
	return (a ?? null) === (b ?? null);
}

/** The entries of `next` whose value differs from the stored `row`. */
export function changedColumns<Row extends Record<string, unknown>, Next extends Partial<Row>>(
	row: Row,
	next: Next
): Partial<Next> {
	return Object.fromEntries(
		Object.entries(next).filter(([key, value]) => !sameValue(row[key], value))
	) as Partial<Next>;
}
