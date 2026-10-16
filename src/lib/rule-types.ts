import { m } from '#lib/paraglide/messages.js';

/** `group_rules.type` values (same list as the schema enum, usable in the browser). */
export const RULE_TYPES = ['points', 'elimination', 'friendly', 'other'] as const;

type RuleType = (typeof RULE_TYPES)[number];

const LABELS: Record<RuleType, () => string> = {
	points: m.group_rules_type_points,
	elimination: m.group_rules_type_elimination,
	friendly: m.group_rules_type_friendly,
	other: m.group_rules_type_other
};

export const ruleTypeLabel = (type: string) =>
	(LABELS[type as RuleType] ?? m.group_rules_type_other)();

export const ruleTypeOptions = () =>
	RULE_TYPES.map((type) => ({ value: type, label: ruleTypeLabel(type) }));
