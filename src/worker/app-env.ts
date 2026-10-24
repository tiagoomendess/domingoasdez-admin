import { variables } from '../env.ts';

type Validation = { value?: unknown; issues?: readonly { message: string }[] };

/**
 * `process.env` validated against the admin's definitions (src/env.ts), so the worker and the
 * admin read every variable the same way. vite.worker.config.ts serves `$app/env/private` and
 * `$app/env/public` from it (SvelteKit only provides them inside the admin build).
 */
export function readAppEnv(source: Record<string, string | undefined>): Record<string, unknown> {
	const values: Record<string, unknown> = {};
	const problems: string[] = [];

	for (const [name, config] of Object.entries(variables)) {
		const result = config.schema['~standard'].validate(source[name]) as
			Validation | Promise<Validation>;
		if (result instanceof Promise) {
			problems.push(`${name}: asynchronous schemas are not supported`);
		} else if (result.issues) {
			problems.push(`${name}: ${result.issues.map((issue) => issue.message).join(', ')}`);
		} else {
			values[name] = result.value;
		}
	}

	if (problems.length > 0) {
		throw new Error(`Invalid environment variables:\n  ${problems.join('\n  ')}`);
	}
	return values;
}
