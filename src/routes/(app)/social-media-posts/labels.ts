import { m } from '#lib/paraglide/messages.js';

/** Option labels of the post's enum columns, shared by the list and the form. */
export const platformLabels = {
	facebook: m.social_posts_platform_facebook,
	instagram: m.social_posts_platform_instagram
};
export const typeLabels = { post: m.social_posts_type_post, story: m.social_posts_type_story };
export const contentLabels = {
	text: m.social_posts_content_text,
	image: m.social_posts_content_image,
	video: m.social_posts_content_video
};

export const options = <K extends string>(labels: Record<K, () => string>) =>
	(Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value]() }));
