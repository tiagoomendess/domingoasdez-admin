import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { can } from '#lib/auth/permissions.ts';
import { m } from '#lib/paraglide/messages.js';
import { requirePermission } from '#lib/server/auth/guard.ts';
import type { Cookies } from '@sveltejs/kit';
import { setFlash } from '#lib/server/flash.ts';
import { mediaUrl, profilePictureUrl } from '#lib/server/media.ts';
import { compareRequest } from '#lib/server/player-update-requests/compare.ts';
import {
	clubTarget,
	findRequest,
	nextPendingId,
	pendingCount,
	possibleDuplicates,
	requestPlayer,
	requestValues,
	reviewerName
} from '#lib/server/player-update-requests/index.ts';
import {
	approveRequest,
	denyRequest,
	deleteRequest
} from '#lib/server/player-update-requests/review.ts';
import { findTeamOption } from '#lib/server/teams/index.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadRequest(id: number) {
	const request = await findRequest(id);
	if (!request) error(404, { message: 'Not found' });
	return request;
}

/** After a decision, go straight to the next pending request (or back to the list). */
async function next(id: number, cookies: Cookies, message: string): Promise<never> {
	setFlash(cookies, { type: 'success', message });
	const nextId = await nextPendingId(id);
	redirect(
		303,
		nextId
			? resolve('/(app)/player-update-requests/[id=id]', { id: nextId })
			: resolve('/(app)/player-update-requests')
	);
}

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('player_update_requests');
	const request = await loadRequest(params.id);
	const player = await requestPlayer(request.playerId);
	const rows = compareRequest(requestValues(request), player?.values ?? null);
	const pending = request.status === 'pending';

	const [club, duplicates, reviewer, pendingTotal, nextId] = await Promise.all([
		request.clubName ? clubTarget(request.clubName, request.team) : null,
		possibleDuplicates(request),
		reviewerName(request.reviewedBy),
		pendingCount(),
		pending ? nextPendingId(request.id) : null
	]);
	const currentTeam = player ? await findTeamOption(player.row.teamId) : null;

	return {
		request: {
			id: request.id,
			playerId: request.playerId,
			name: request.name,
			nickname: request.nickname,
			team: request.team,
			// The source's note ("last seen at …"); a new player gets it as notes (see `rows`).
			note: request.playerId ? request.obs : null,
			status: request.status,
			createdBy: request.createdBy,
			createdAt: request.createdAt,
			reviewedAt: request.reviewedAt,
			reviewNotes: request.reviewNotes,
			reviewer
		},
		player: player
			? {
					id: player.row.id,
					name: player.row.name,
					picture: profilePictureUrl(player.row.picture),
					hasPicture: Boolean(player.row.picture),
					team: currentTeam
				}
			: null,
		rows: rows.map((row) => ({
			...row,
			// Stored paths become loadable URLs; the requested picture is a remote link.
			current: row.field === 'picture' ? mediaUrl(row.current) : row.current
		})),
		club,
		duplicates,
		pendingTotal,
		nextId,
		canReview: pending && can(user.permissions, 'player_update_requests.edit'),
		canDelete: can(user.permissions, 'player_update_requests.create')
	};
};

export const actions: Actions = {
	approve: async ({ params, request, cookies }) => {
		const user = requirePermission('player_update_requests.edit');
		const updateRequest = await loadRequest(params.id);
		const result = await approveRequest(await request.formData(), updateRequest, user);
		if ('failure' in result) return result.failure;

		const message = result.created
			? m.update_requests_approved_created({ name: result.player.name })
			: m.update_requests_approved({ name: result.player.name });
		return next(updateRequest.id, cookies, message);
	},

	deny: async ({ params, request, cookies }) => {
		const user = requirePermission('player_update_requests.edit');
		const updateRequest = await loadRequest(params.id);
		const result = await denyRequest(await request.formData(), updateRequest, user);
		if ('failure' in result) return result.failure;

		return next(updateRequest.id, cookies, m.update_requests_denied({ id: updateRequest.id }));
	},

	delete: async ({ params, cookies }) => {
		requirePermission('player_update_requests.create');
		const updateRequest = await loadRequest(params.id);
		await deleteRequest(updateRequest);

		setFlash(cookies, {
			type: 'success',
			message: m.update_requests_deleted({ id: updateRequest.id })
		});
		redirect(303, resolve('/(app)/player-update-requests'));
	}
};
