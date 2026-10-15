/** The signed-in admin, as exposed to pages through `locals.user` / layout data. */
export type AdminUser = {
	id: number;
	name: string;
	email: string;
	picture: string;
	/** Permission names granted to the user (`admin` implies all of them). */
	permissions: string[];
};
