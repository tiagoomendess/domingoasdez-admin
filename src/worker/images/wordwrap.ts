const NEWLINE = 0x0a;
const SPACE = 0x20;

/**
 * PHP `wordwrap($text, $width)` (break "\n", no cutting), as the legacy images wrapped their
 * texts, split into lines. Like PHP it counts UTF-8 bytes, not characters, so accented text wraps a
 * little earlier, and a word longer than `width` stays whole on its own line. A port of the
 * single-character-break branch of `php_wordwrap()`: spaces are turned into line breaks in place.
 */
export function phpWordwrap(text: string, width: number): string[] {
	const bytes = Buffer.from(text, 'utf8');
	let lastStart = 0;
	let lastSpace = 0;
	for (let current = 0; current < bytes.length; current++) {
		if (bytes[current] === NEWLINE) {
			lastStart = lastSpace = current + 1;
		} else if (bytes[current] === SPACE) {
			if (current - lastStart >= width) {
				bytes[current] = NEWLINE;
				lastStart = current + 1;
			}
			lastSpace = current;
		} else if (current - lastStart >= width && lastStart !== lastSpace) {
			bytes[lastSpace] = NEWLINE;
			lastStart = lastSpace + 1;
		}
	}
	return bytes.toString('utf8').split('\n');
}
