import { mediaUrl } from '#lib/server/media.ts';
import { requireUser } from '#lib/server/auth/guard.ts';
import { takeFlash } from '#lib/server/flash.ts';
import { DEFAULT_TIMEZONE, isTimeZone } from '#lib/format.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => {
	const timezone = cookies.get('timezone');
	return {
		user: requireUser(),
		sidenavImage: mediaUrl('/images/sidenav_image.jpg'),
		/** The admin's timezone, to show the UTC dates of the database. */
		timezone: isTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE,
		/** Toast after a create / save / delete redirect. */
		flash: takeFlash(cookies)
	};
};
