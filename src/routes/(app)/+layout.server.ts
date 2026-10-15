import { mediaUrl } from '#lib/server/media.ts';
import { requireUser } from '#lib/server/auth/guard.ts';
import { takeFlash } from '#lib/server/flash.ts';
import { adminTimeZone } from '#lib/server/timezone.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => {
	return {
		user: requireUser(),
		sidenavImage: mediaUrl('/images/sidenav_image.jpg'),
		/** The admin's timezone, to show the UTC dates of the database. */
		timezone: adminTimeZone(cookies),
		/** Toast after a create / save / delete redirect. */
		flash: takeFlash(cookies)
	};
};
