-- Comments on a game by signed-in users, with up/down votes (domingoasdez-app game page).
-- Not the flash interviews, which keep the `game_comments` name. Two new tables only; nothing
-- existing is touched, so the running legacy site, admin and app are unaffected.
CREATE TABLE `match_comment_votes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`match_comment_id` int unsigned NOT NULL,
	`user_id` int unsigned NOT NULL,
	`value` tinyint NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `match_comment_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_comment_votes_match_comment_id_user_id_unique` UNIQUE(`match_comment_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `match_comments` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`game_id` int unsigned NOT NULL,
	`match_comment_id` int unsigned,
	`content` text,
	`user_id` int unsigned NOT NULL,
	`deleted` boolean NOT NULL DEFAULT false,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `match_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `match_comment_votes` ADD CONSTRAINT `match_comment_votes_match_comment_id_match_comments_id_fk` FOREIGN KEY (`match_comment_id`) REFERENCES `match_comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_comment_votes` ADD CONSTRAINT `match_comment_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_comments` ADD CONSTRAINT `match_comments_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_comments` ADD CONSTRAINT `match_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_comments` ADD CONSTRAINT `match_comments_match_comment_id_foreign` FOREIGN KEY (`match_comment_id`) REFERENCES `match_comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `match_comments_game_id_created_at_index` ON `match_comments` (`game_id`,`created_at`);