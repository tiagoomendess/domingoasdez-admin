import { defineParams } from '@sveltejs/kit/params';

/** Route parameter matchers (`[id=id]`). */
export const params = defineParams({
	/** A row id (MySQL unsigned INT): `/clubs/12` matches, `/clubs/new` and `/clubs/0` don't. */
	id: (param) => {
		if (!/^[1-9]\d{0,9}$/.test(param)) return undefined;
		const id = Number(param);
		return id <= 4_294_967_295 ? id : undefined;
	}
});
