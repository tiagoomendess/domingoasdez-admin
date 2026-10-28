-- Club setup for the stadium screens of domingoasdez-app: each club's look (colours, background
-- image) and up to 5 ad spots, plus an overlay on `placards` (an ad break now; substitutions and
-- messages later) with the ad rotation and cooldown. New tables and nullable columns only.
CREATE TABLE `club_placard_ads` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned NOT NULL,
	`image` varchar(255) NOT NULL,
	`duration_seconds` tinyint unsigned NOT NULL DEFAULT 10,
	`position` tinyint unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `club_placard_ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `club_placard_settings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`club_id` int unsigned NOT NULL,
	`text_color` char(7),
	`background_color` char(7),
	`background_image` varchar(255),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `club_placard_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `club_placard_settings_club_id_unique` UNIQUE(`club_id`)
);
--> statement-breakpoint
ALTER TABLE `placards` ADD `overlay_type` varchar(20);--> statement-breakpoint
ALTER TABLE `placards` ADD `overlay_payload` json;--> statement-breakpoint
ALTER TABLE `placards` ADD `overlay_started_at` datetime(3);--> statement-breakpoint
ALTER TABLE `placards` ADD `overlay_ends_at` datetime(3);--> statement-breakpoint
ALTER TABLE `placards` ADD `last_ad_at` datetime(3);--> statement-breakpoint
ALTER TABLE `placards` ADD `next_ad_id` int unsigned;--> statement-breakpoint
ALTER TABLE `club_placard_ads` ADD CONSTRAINT `club_placard_ads_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `club_placard_settings` ADD CONSTRAINT `club_placard_settings_club_id_clubs_id_fk` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `club_placard_ads_club_id_position_index` ON `club_placard_ads` (`club_id`,`position`);--> statement-breakpoint
ALTER TABLE `placards` ADD CONSTRAINT `placards_next_ad_id_club_placard_ads_id_fk` FOREIGN KEY (`next_ad_id`) REFERENCES `club_placard_ads`(`id`) ON DELETE set null ON UPDATE no action;