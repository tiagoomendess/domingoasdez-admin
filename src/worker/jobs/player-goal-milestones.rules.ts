/** Legacy `PlayerGoalMilestones::MILESTONES`. */
export const MILESTONES = [50, 75, 100, 125, 150, 200, 250, 300];
/** A milestone counts for this many goals after it (goals added late, several in one game). */
const GRACE = 3;

/** The highest milestone `total` is at or just past (up to 3 more), or null. */
export function reachedMilestone(total: number): number | null {
	let reached: number | null = null;
	for (const milestone of MILESTONES) {
		if (total >= milestone && total <= milestone + GRACE) reached = milestone;
	}
	return reached;
}

/** `idempotency_records.key`: a milestone is celebrated once per player. */
export const milestoneKey = (playerId: number, milestone: number) =>
	`player_${playerId}_goal_posted_${milestone}`;

/** Legacy `Player::firstAndLastName()`: first and last space-separated words. */
export function firstAndLastName(name: string | null): string {
	if (!name) return '';
	const parts = name.split(' ');
	if (parts.length < 2) return name;
	return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** Legacy `Player::displayName()`. */
export const displayName = (name: string | null, nickname: string | null) => {
	const short = firstAndLastName(name);
	return nickname ? `${short} (${nickname})` : short;
};

/** Legacy `Player::getAge()`: whole years at `now` (UTC), from `YYYY-MM-DD…`. */
export function playerAge(birthDate: string | null, now: Date): number | null {
	if (!birthDate) return null;
	const [year, month, day] = birthDate.slice(0, 10).split('-').map(Number);
	let age = now.getUTCFullYear() - year;
	const nowMonth = now.getUTCMonth() + 1;
	if (nowMonth < month || (nowMonth === month && now.getUTCDate() < day)) age--;
	return age;
}

export const DEFAULT_PROFILE_PICTURE = '/images/default-profile.png';

/**
 * Legacy `Player::getAgeSafePicture()` outside a request: the photo only for players 18 or older
 * (unknown age counts as under 18), else the default profile picture.
 */
export function ageSafePicture(
	player: { picture: string | null; birthDate: string | null },
	now: Date
): string {
	const age = playerAge(player.birthDate, now);
	if (age !== null && age >= 18 && player.picture) return player.picture;
	return DEFAULT_PROFILE_PICTURE;
}

export const milestonePostText = (displayName: string, club: string | null, milestone: number) =>
	`⚽ ${displayName}${club ? ` do ${club}` : ''} atingiu a marca dos ${milestone} golos! Parabéns! 🎉`;
