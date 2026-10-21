-- Up/down votes on article comments (domingoasdez-app article pages), like match_comment_votes.
-- One new table; article_comments itself is untouched, so the legacy site is unaffected.
CREATE TABLE `article_comment_votes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`article_comment_id` int unsigned NOT NULL,
	`user_id` int unsigned NOT NULL,
	`value` tinyint NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `article_comment_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_comment_votes_article_comment_id_user_id_unique` UNIQUE(`article_comment_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `article_comment_votes` ADD CONSTRAINT `article_comment_votes_article_comment_id_article_comments_id_fk` FOREIGN KEY (`article_comment_id`) REFERENCES `article_comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_comment_votes` ADD CONSTRAINT `article_comment_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;