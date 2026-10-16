import { error, json } from '@sveltejs/kit';
import { canEditAnyScore, canEditGameScore, canUseToday } from '#lib/auth/access.ts';
import { requireUser } from '#lib/server/auth/guard.ts';
import { findScoreGame, gameReports } from '#lib/server/today/index.ts';
import type { RequestHandler } from './$types';

/** The reports of one game (legacy `/jogos/{game}/resultados-enviados`), for the details modal. */
export const GET: RequestHandler = async ({ params }) => {
	const user = requireUser();
	if (!canUseToday(user)) error(403, { message: 'Forbidden' });
	const game = await findScoreGame(params.id);
	if (!game || !canEditGameScore(user, game)) error(404, { message: 'Not found' });
	return json({ reports: await gameReports(params.id, canEditAnyScore(user)) });
};
