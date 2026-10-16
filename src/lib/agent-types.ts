import { m } from '#lib/paraglide/messages.js';

/** `team_agents.agent_type` values (same list as the schema enum, usable in the browser). */
export const AGENT_TYPES = [
	'manager',
	'assistant_manager',
	'goalkeeper_manager',
	'director'
] as const;

export type AgentTypeName = (typeof AGENT_TYPES)[number];

const LABELS: Record<AgentTypeName, () => string> = {
	manager: m.team_agents_type_manager,
	assistant_manager: m.team_agents_type_assistant_manager,
	goalkeeper_manager: m.team_agents_type_goalkeeper_manager,
	director: m.team_agents_type_director
};

export const agentTypeLabel = (type: string) =>
	(LABELS[type as AgentTypeName] ?? m.team_agents_type_manager)();

export const agentTypeOptions = () =>
	AGENT_TYPES.map((type) => ({ value: type, label: agentTypeLabel(type) }));
