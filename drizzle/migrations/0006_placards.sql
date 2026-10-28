-- Stadium screens ("placard eletrónico") in domingoasdez-app, which replaces the standalone
-- react-scoreboard / scoreboard-api that kept everything in memory. `placards` holds each screen's
-- live state, `placard_events` logs every action. Two new tables; nothing existing is touched.
CREATE TABLE `placard_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`placard_id` int unsigned NOT NULL,
	`game_id` int unsigned,
	`user_id` int unsigned,
	`type` varchar(30) NOT NULL,
	`payload` json,
	`created_at` timestamp,
	CONSTRAINT `placard_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `placards` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`device_token_hash` char(64) NOT NULL,
	`pairing_code` char(6),
	`pairing_code_expires_at` datetime,
	`scene` varchar(20) NOT NULL DEFAULT 'pairing',
	`game_id` int unsigned,
	`controller_user_id` int unsigned,
	`home_score` tinyint unsigned NOT NULL DEFAULT 0,
	`away_score` tinyint unsigned NOT NULL DEFAULT 0,
	`period` varchar(20) NOT NULL DEFAULT 'first_half',
	`clock_elapsed_ms` int unsigned NOT NULL DEFAULT 0,
	`clock_running_since` datetime(3),
	`version` int unsigned NOT NULL DEFAULT 0,
	`paired_at` datetime,
	`last_action_at` datetime,
	`last_seen_at` datetime,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `placards_id` PRIMARY KEY(`id`),
	CONSTRAINT `placards_device_token_hash_unique` UNIQUE(`device_token_hash`),
	CONSTRAINT `placards_pairing_code_unique` UNIQUE(`pairing_code`)
);
--> statement-breakpoint
ALTER TABLE `placard_events` ADD CONSTRAINT `placard_events_placard_id_placards_id_fk` FOREIGN KEY (`placard_id`) REFERENCES `placards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placard_events` ADD CONSTRAINT `placard_events_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placard_events` ADD CONSTRAINT `placard_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placards` ADD CONSTRAINT `placards_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `placards` ADD CONSTRAINT `placards_controller_user_id_users_id_fk` FOREIGN KEY (`controller_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `placard_events_placard_id_created_at_index` ON `placard_events` (`placard_id`,`created_at`);