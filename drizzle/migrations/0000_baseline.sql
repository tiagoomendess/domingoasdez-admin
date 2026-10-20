-- Baseline: the schema Laravel migrations had built (last one 2026_09_25_114800). Existing
-- databases are marked as migrated with `npm run db:baseline` and never run this file; it only
-- builds fresh databases (CI, tests). Tables inherit Laravel's collation from the database.
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `article_comments` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`article_id` int unsigned NOT NULL,
	`article_comment_id` int unsigned,
	`content` text,
	`user_id` int unsigned NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	`deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `article_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`media_id` int unsigned,
	`title` varchar(155) NOT NULL,
	`description` text,
	`text` longtext NOT NULL,
	`user_id` int unsigned NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`tags` text,
	`visible` boolean NOT NULL DEFAULT true,
	`facebook_post_id` varchar(144),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`action` varchar(25) NOT NULL,
	`model` varchar(50),
	`model_id` bigint unsigned,
	`old_values` text,
	`new_values` text,
	`ip_address` varchar(45),
	`ip_country` varchar(155),
	`user_agent` varchar(255),
	`timezone` varchar(30),
	`language` varchar(155),
	`extra_info` varchar(155),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clubs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`founding_date` date,
	`birthday_post_enabled` boolean NOT NULL DEFAULT true,
	`contact_email` varchar(155),
	`notifications_enabled` boolean NOT NULL DEFAULT true,
	`admin_user_id` int unsigned,
	`emblem` text,
	`website` varchar(155),
	`visible` boolean NOT NULL DEFAULT true,
	`priority` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `clubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`picture` text,
	`visible` boolean NOT NULL DEFAULT true,
	`social_media_enabled` boolean NOT NULL DEFAULT true,
	`priority` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delete_requests` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`verification_code` varchar(155) NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`cancelled` boolean NOT NULL DEFAULT false,
	`processed` boolean NOT NULL DEFAULT false,
	`motive` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `delete_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`from` varchar(155),
	`to` text,
	`cc` text,
	`bcc` text,
	`subject` varchar(255),
	`body` longtext,
	`headers` text,
	`attachments` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `email_outbox_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_comments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` char(36) NOT NULL,
	`pin` char(4) NOT NULL,
	`game_id` int unsigned NOT NULL,
	`team_id` int unsigned NOT NULL,
	`user_id` int unsigned,
	`content` text NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`deadline` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_comments_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_comments_uuid_unique` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `game_groups` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155),
	`season_id` int unsigned NOT NULL,
	`group_rules_id` int unsigned NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `game_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_referees` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`game_id` int unsigned NOT NULL,
	`referee_id` int unsigned NOT NULL,
	`referee_type_id` int unsigned NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `game_referees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`home_team_id` int unsigned NOT NULL,
	`away_team_id` int unsigned NOT NULL,
	`game_group_id` int unsigned NOT NULL,
	`round` int NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`playground_id` int unsigned,
	`goals_home` int,
	`goals_away` int,
	`penalties_home` int,
	`penalties_away` int,
	`finished` boolean NOT NULL DEFAULT false,
	`visible` boolean NOT NULL DEFAULT true,
	`postponed` boolean NOT NULL DEFAULT false,
	`image` varchar(255),
	`generate_image` boolean NOT NULL DEFAULT false,
	`scoreboard_updates` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned,
	`team_id` int unsigned NOT NULL,
	`game_id` int unsigned NOT NULL,
	`own_goal` boolean NOT NULL DEFAULT false,
	`penalty` boolean NOT NULL DEFAULT false,
	`minute` int,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_rules` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`promotes` int NOT NULL DEFAULT 0,
	`relegates` int NOT NULL DEFAULT 0,
	`type` enum('points','elimination','friendly','other') NOT NULL,
	`tie_breaker_script` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `group_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_rules_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `group_rules_positions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`group_rules_id` int unsigned NOT NULL,
	`positions` varchar(155) NOT NULL,
	`color` varchar(155) NOT NULL,
	`label` varchar(155) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `group_rules_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `honey_pot_catches` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ip_address` varchar(39) NOT NULL,
	`ip_country` varchar(2),
	`user_agent` varchar(255) NOT NULL,
	`route` varchar(155) NOT NULL,
	`http_method` varchar(10) NOT NULL,
	`query_params` varchar(500) NOT NULL,
	`headers` text NOT NULL,
	`cookies` text NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `honey_pot_catches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idempotency_records` (
	`key` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `idempotency_records_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `info_reports` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(12) NOT NULL,
	`user_id` int unsigned,
	`status` enum('sent','seen','used','archived','deleted') NOT NULL,
	`content` varchar(500) NOT NULL,
	`source` varchar(155) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `info_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `info_reports_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`url` text NOT NULL,
	`thumbnail_url` text,
	`media_type` enum('none','image','video','youtube','download','other') NOT NULL,
	`tags` text,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mvp_votes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`game_id` int unsigned NOT NULL,
	`player_id` int unsigned NOT NULL,
	`user_id` int unsigned NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `mvp_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`slug` varchar(155) NOT NULL,
	`title` varchar(155) NOT NULL,
	`picture` varchar(155) NOT NULL,
	`body` text NOT NULL,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `partner_clicks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`partner_id` int unsigned NOT NULL,
	`page` varchar(155),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `partner_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`url` varchar(150) NOT NULL,
	`picture` varchar(255) NOT NULL,
	`priority` int unsigned NOT NULL,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`email` varchar(155) NOT NULL,
	`token` varchar(155) NOT NULL,
	`created_at` timestamp
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_update_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned,
	`name` varchar(155),
	`nickname` varchar(155),
	`club_name` varchar(155),
	`team` varchar(155),
	`picture_url` text,
	`association_id` varchar(155),
	`phone` varchar(155),
	`email` varchar(155),
	`facebook_profile` text,
	`birth_date` timestamp,
	`position` enum('none','striker','midfielder','defender','goalkeeper'),
	`obs` text,
	`status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
	`created_by` varchar(155),
	`reviewed_by` int unsigned,
	`reviewed_at` timestamp,
	`review_notes` text,
	`source_data` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `player_update_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`picture` text,
	`association_id` varchar(155),
	`nickname` varchar(155),
	`phone` varchar(155),
	`email` varchar(155),
	`facebook_profile` text,
	`obs` text,
	`birth_date` timestamp,
	`position` enum('none','striker','midfielder','defender','goalkeeper') NOT NULL DEFAULT 'none',
	`team_id` int unsigned,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `players_id` PRIMARY KEY(`id`),
	CONSTRAINT `players_association_id_unique` UNIQUE(`association_id`)
);
--> statement-breakpoint
CREATE TABLE `playgrounds` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned,
	`name` varchar(155) NOT NULL,
	`surface` varchar(155) NOT NULL,
	`width` int,
	`height` int,
	`capacity` int,
	`picture` text,
	`obs` text,
	`location` point,
	`visible` boolean NOT NULL DEFAULT true,
	`priority` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `playgrounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_answer_votes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`poll_answer_id` int unsigned NOT NULL,
	`user_id` int unsigned,
	`ip` varchar(70),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `poll_answer_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_answers` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`poll_id` int unsigned NOT NULL,
	`answer` varchar(144) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `poll_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`question` varchar(144) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`show_results_after` datetime NOT NULL,
	`publish_after` datetime NOT NULL,
	`close_after` datetime NOT NULL,
	`image` varchar(255),
	`update_image` boolean NOT NULL DEFAULT true,
	`visible` boolean NOT NULL DEFAULT false,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `polls_id` PRIMARY KEY(`id`),
	CONSTRAINT `polls_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `referee_types` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `referee_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referees` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155) NOT NULL,
	`picture` text,
	`obs` text,
	`association` varchar(155) NOT NULL DEFAULT 'none',
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `referees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `score_report_bans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned,
	`ip_address` varchar(45),
	`uuid` varchar(40),
	`user_agent` varchar(255),
	`shadow_ban` boolean NOT NULL DEFAULT false,
	`ip_ban` boolean NOT NULL DEFAULT false,
	`reason` varchar(255),
	`expires_at` timestamp,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `score_report_bans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `score_reports` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned,
	`game_id` int unsigned NOT NULL,
	`home_score` tinyint unsigned NOT NULL,
	`away_score` tinyint unsigned NOT NULL,
	`source` varchar(25) NOT NULL,
	`ip_address` varchar(45),
	`ip_country` varchar(155),
	`user_agent` varchar(255),
	`location` point,
	`location_accuracy` decimal(8,4),
	`uuid` varchar(40),
	`finished` boolean NOT NULL DEFAULT false,
	`is_fake` boolean NOT NULL DEFAULT false,
	`is_correct` boolean NOT NULL DEFAULT false,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `score_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`competition_id` int unsigned NOT NULL,
	`name` varchar(155),
	`picture` text,
	`start_year` int NOT NULL,
	`end_year` int NOT NULL,
	`obs` text,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_media_posts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`published` boolean NOT NULL DEFAULT false,
	`publish_at` timestamp NOT NULL,
	`platform` enum('facebook','instagram') NOT NULL DEFAULT 'facebook',
	`post_type` enum('post','story') NOT NULL DEFAULT 'post',
	`post_content_type` enum('text','image','video') NOT NULL,
	`text_content` varchar(512),
	`media_path` varchar(512),
	`error_message` varchar(1024),
	`media_external_id` varchar(128),
	`post_id` varchar(128),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `social_media_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_providers` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`provider_id` varchar(155) NOT NULL,
	`provider` varchar(155) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `social_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_agents` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned,
	`team_id` int unsigned,
	`name` varchar(155) NOT NULL,
	`birth_date` varchar(155),
	`external_id` varchar(155),
	`email` varchar(155),
	`phone` varchar(155),
	`picture` varchar(155),
	`agent_type` enum('manager','assistant_manager','goalkeeper_manager','director') NOT NULL DEFAULT 'manager',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `team_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_agents_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`team_agent_id` bigint unsigned NOT NULL,
	`team_id` int unsigned,
	`agent_type` enum('manager','assistant_manager','goalkeeper_manager','director') NOT NULL DEFAULT 'manager',
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `team_agents_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned NOT NULL,
	`name` varchar(155) NOT NULL,
	`contact_email` varchar(155),
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`player_id` int unsigned NOT NULL,
	`team_id` int unsigned,
	`date` timestamp NOT NULL DEFAULT (now()),
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_bans` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`banned_user_id` int unsigned NOT NULL,
	`reason` varchar(155) NOT NULL,
	`banned_by_user_id` int unsigned NOT NULL,
	`pardoned` boolean NOT NULL DEFAULT false,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `user_bans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`permission_id` int unsigned NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`phone` varchar(20),
	`bio` text,
	`user_id` int unsigned NOT NULL,
	`picture` text,
	`account_data_consent` timestamp,
	`analytics_cookies_consent` timestamp,
	`all_data_consent` timestamp,
	`timezone` varchar(20) NOT NULL DEFAULT 'Europe/Lisbon',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_uuids` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `user_uuids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(155),
	`email` varchar(155),
	`password` varchar(155),
	`email_token` varchar(20),
	`verified` boolean NOT NULL DEFAULT false,
	`remember_token` varchar(100),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `uuid_karmas` (
	`uuid` varchar(36) NOT NULL,
	`karma` int NOT NULL DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `uuid_karmas_uuid` PRIMARY KEY(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `variables` (
	`name` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `variables_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
ALTER TABLE `article_comments` ADD CONSTRAINT `article_comments_article_id_articles_id_fk` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_comments` ADD CONSTRAINT `article_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_comments` ADD CONSTRAINT `article_comments_article_comment_id_foreign` FOREIGN KEY (`article_comment_id`) REFERENCES `article_comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clubs` ADD CONSTRAINT `clubs_admin_user_id_users_id_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delete_requests` ADD CONSTRAINT `delete_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_comments` ADD CONSTRAINT `game_comments_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_comments` ADD CONSTRAINT `game_comments_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_comments` ADD CONSTRAINT `game_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_groups` ADD CONSTRAINT `game_groups_season_id_seasons_id_fk` FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_groups` ADD CONSTRAINT `game_groups_group_rules_id_group_rules_id_fk` FOREIGN KEY (`group_rules_id`) REFERENCES `group_rules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_referees` ADD CONSTRAINT `game_referees_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_referees` ADD CONSTRAINT `game_referees_referee_id_referees_id_fk` FOREIGN KEY (`referee_id`) REFERENCES `referees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_referees` ADD CONSTRAINT `game_referees_referee_type_id_referee_types_id_fk` FOREIGN KEY (`referee_type_id`) REFERENCES `referee_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_home_team_id_teams_id_fk` FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_away_team_id_teams_id_fk` FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_game_group_id_game_groups_id_fk` FOREIGN KEY (`game_group_id`) REFERENCES `game_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_playground_id_playgrounds_id_fk` FOREIGN KEY (`playground_id`) REFERENCES `playgrounds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `goals` ADD CONSTRAINT `goals_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_rules_positions` ADD CONSTRAINT `group_rules_positions_group_rules_id_group_rules_id_fk` FOREIGN KEY (`group_rules_id`) REFERENCES `group_rules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` ADD CONSTRAINT `media_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mvp_votes` ADD CONSTRAINT `mvp_votes_game_id_games_id_fk` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mvp_votes` ADD CONSTRAINT `mvp_votes_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mvp_votes` ADD CONSTRAINT `mvp_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player_update_requests` ADD CONSTRAINT `player_update_requests_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `player_update_requests` ADD CONSTRAINT `player_update_requests_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `players` ADD CONSTRAINT `players_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playgrounds` ADD CONSTRAINT `playgrounds_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_answer_votes` ADD CONSTRAINT `poll_answer_votes_poll_answer_id_poll_answers_id_fk` FOREIGN KEY (`poll_answer_id`) REFERENCES `poll_answers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_answer_votes` ADD CONSTRAINT `poll_answer_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_answers` ADD CONSTRAINT `poll_answers_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seasons` ADD CONSTRAINT `seasons_competition_id_competitions_id_fk` FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_agents` ADD CONSTRAINT `team_agents_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_agents` ADD CONSTRAINT `team_agents_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_agents_history` ADD CONSTRAINT `team_agents_history_team_agent_id_team_agents_id_fk` FOREIGN KEY (`team_agent_id`) REFERENCES `team_agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_player_id_players_id_fk` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transfers` ADD CONSTRAINT `transfers_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_bans` ADD CONSTRAINT `user_bans_banned_user_id_users_id_fk` FOREIGN KEY (`banned_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_bans` ADD CONSTRAINT `user_bans_banned_by_user_id_users_id_fk` FOREIGN KEY (`banned_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_uuids` ADD CONSTRAINT `user_uuids_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_user_id_index` ON `audit` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_action_index` ON `audit` (`action`);--> statement-breakpoint
CREATE INDEX `audit_model_index` ON `audit` (`model`);--> statement-breakpoint
CREATE INDEX `game_comments_team_id_index` ON `game_comments` (`team_id`);--> statement-breakpoint
CREATE INDEX `game_comments_game_id_index` ON `game_comments` (`game_id`);--> statement-breakpoint
CREATE INDEX `game_comments_deadline_index` ON `game_comments` (`deadline`);--> statement-breakpoint
CREATE INDEX `honey_pot_catches_ip_address_index` ON `honey_pot_catches` (`ip_address`);--> statement-breakpoint
CREATE INDEX `honey_pot_catches_ip_country_index` ON `honey_pot_catches` (`ip_country`);--> statement-breakpoint
CREATE INDEX `honey_pot_catches_route_index` ON `honey_pot_catches` (`route`);--> statement-breakpoint
CREATE INDEX `honey_pot_catches_http_method_index` ON `honey_pot_catches` (`http_method`);--> statement-breakpoint
CREATE INDEX `password_resets_email_index` ON `password_resets` (`email`);--> statement-breakpoint
CREATE INDEX `player_update_requests_player_id_index` ON `player_update_requests` (`player_id`);--> statement-breakpoint
CREATE INDEX `player_update_requests_status_index` ON `player_update_requests` (`status`);--> statement-breakpoint
CREATE INDEX `player_update_requests_created_by_index` ON `player_update_requests` (`created_by`);--> statement-breakpoint
CREATE INDEX `player_update_requests_reviewed_by_index` ON `player_update_requests` (`reviewed_by`);--> statement-breakpoint
CREATE INDEX `poll_answer_votes_ip_user_id_index` ON `poll_answer_votes` (`ip`,`user_id`);--> statement-breakpoint
CREATE INDEX `score_report_bans_ip_address_index` ON `score_report_bans` (`ip_address`);--> statement-breakpoint
CREATE INDEX `score_report_bans_uuid_index` ON `score_report_bans` (`uuid`);--> statement-breakpoint
CREATE INDEX `score_reports_game_id_index` ON `score_reports` (`game_id`);--> statement-breakpoint
CREATE INDEX `score_reports_source_index` ON `score_reports` (`source`);--> statement-breakpoint
CREATE INDEX `score_reports_ip_address_index` ON `score_reports` (`ip_address`);--> statement-breakpoint
CREATE INDEX `score_reports_uuid_index` ON `score_reports` (`uuid`);--> statement-breakpoint
CREATE INDEX `social_media_posts_published_index` ON `social_media_posts` (`published`);--> statement-breakpoint
CREATE INDEX `social_media_posts_publish_at_index` ON `social_media_posts` (`publish_at`);--> statement-breakpoint
CREATE INDEX `social_media_posts_media_external_id_index` ON `social_media_posts` (`media_external_id`);--> statement-breakpoint
CREATE INDEX `user_uuids_uuid_index` ON `user_uuids` (`uuid`);