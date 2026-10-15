import { m } from '#lib/paraglide/messages.js';

/** `players.position` values (same list as the schema enum, usable in the browser). */
export const PLAYER_POSITIONS = [
	'none',
	'goalkeeper',
	'defender',
	'midfielder',
	'striker'
] as const;

export type PlayerPositionName = (typeof PLAYER_POSITIONS)[number];

const LABELS: Record<PlayerPositionName, () => string> = {
	none: m.players_position_none,
	goalkeeper: m.players_position_goalkeeper,
	defender: m.players_position_defender,
	midfielder: m.players_position_midfielder,
	striker: m.players_position_striker
};

export const positionLabel = (position: string) =>
	(LABELS[position as PlayerPositionName] ?? m.players_position_none)();

export const positionOptions = () =>
	PLAYER_POSITIONS.map((position) => ({ value: position, label: positionLabel(position) }));
