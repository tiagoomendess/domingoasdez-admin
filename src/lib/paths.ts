import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';

/**
 * `resolve()` for paths built at runtime (navigation entries, links to sections not ported yet).
 * Its typing only accepts one literal route at a time, not a `string` or a union of paths.
 */
export function resolvePath(path: string): ResolvedPathname {
	return (resolve as (path: string) => ResolvedPathname)(path);
}
