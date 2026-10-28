/** A screen not seen for this long is forgotten: its TV would get a new one on its next visit. */
export const SCREEN_DAYS_TO_KEEP = 30;
/** Events of screens still in use are kept this long. */
export const EVENT_DAYS_TO_KEEP = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

export const cutoffs = (now: Date) => ({
	screens: new Date(now.getTime() - SCREEN_DAYS_TO_KEEP * DAY_MS),
	events: new Date(now.getTime() - EVENT_DAYS_TO_KEEP * DAY_MS)
});
