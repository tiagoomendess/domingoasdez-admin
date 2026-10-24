# Worker image assets

Copied from the legacy site's `public/` folder, for the images the jobs generate (docs/jobs.md).
The worker build copies this folder to `build/worker/assets/` (`vite.worker.config.ts`).

- `fonts/Roboto-Regular.ttf`, `fonts/Roboto-Black.ttf`: [Roboto](https://fonts.google.com/specimen/Roboto)
  by Christian Robertson / Google, Apache License 2.0.
- `images/game_image_watermark.png`, `images/game_image_postponed_watermark.png`: game cover
  overlays (1280×720).
- `images/story_watermark.png`: match story overlay (1080×1920).
- `images/poll_default.png`: poll image background (1280×720).
- `images/16_9_placeholder_<n>.jpg`, `images/1_1_placeholder_<n>.jpg`: legacy `Media::getPlaceholder()`
  backgrounds, picked by the last digit of an id.
- `images/default-emblem.png`: legacy `custom.default_emblem`, for clubs without an emblem.
- `images/default-profile.png`: legacy `custom.default_profile_pic`, for players without a picture
  (or under 18).
- `social_media_poster/`: templates of the social media images, from legacy
  `public/social_media_poster/`: `story_more_matches.png` (1080×1920), `birthday_story.png`
  (1080×1920), `birthday_post.png` (1000×1250), `post_watermark.png` (1080×1350). Its
  `story_watermark.png` is the same file as `images/story_watermark.png`.
