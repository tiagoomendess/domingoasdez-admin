-- Score predictions on the public game page (domingoasdez-app): one row per user and game,
-- editable until kick-off. One new table; nothing existing is touched.
CREATE TABLE `game_predictions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`game_id` int unsigned NOT NULL,
	`user_id` int unsigned NOT NULL,
	`goals_home` tinyint unsigned NOT NULL,
	`goals_away` tinyint unsigned NOT NULL,
	`penalty_winner` enum('home','away'),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `game_predictions_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_predictions_game_id_user_id_unique` UNIQUE(`game_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `game_predictions` ADD CONSTRAINT `game_predictions_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_predictions` ADD CONSTRAINT `game_predictions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;