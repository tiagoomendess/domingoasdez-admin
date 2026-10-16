import { m } from '#lib/paraglide/messages.js';

const labels: Record<string, () => string> = {
	create: m.audit_action_create,
	update: m.audit_action_update,
	delete: m.audit_action_delete,
	view: m.audit_action_view,
	login: m.audit_action_login,
	login_failed: m.audit_action_login_failed,
	logout: m.audit_action_logout,
	register: m.audit_action_register,
	forgot_password: m.audit_action_forgot_password,
	other: m.audit_action_other
};

/** Legacy `Audit::ACTIONS`, in the order of the filter. */
export const ACTIONS = Object.keys(labels);

export const actionLabel = (action: string) => labels[action]?.() ?? action;
