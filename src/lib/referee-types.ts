import { m } from '#lib/paraglide/messages.js';

/** Labels of the `referee_types` rows (their `name` is a key, not text for people). */
const LABELS: Record<string, () => string> = {
	main: m.games_referee_type_main,
	assistant: m.games_referee_type_assistant,
	fourth_official: m.games_referee_type_fourth_official,
	goal_line: m.games_referee_type_goal_line,
	var: m.games_referee_type_var,
	var_assistant: m.games_referee_type_var_assistant
};

export const refereeTypeLabel = (name: string) => LABELS[name]?.() ?? name;
