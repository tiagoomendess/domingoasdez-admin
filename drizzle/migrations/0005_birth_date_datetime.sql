-- Birth dates before 1970 could not be stored: TIMESTAMP only covers 1970-01-01 to 2038-01-19.
-- The player sync estimates a new player's birth date as today minus their age, so every create
-- request for a player aged 57 or more failed (`POST /api/player-update-requests` 500,
-- "Incorrect datetime value"), as it did on Laravel, and approving one would fail on `players`.
-- DATETIME keeps the same `Y-m-d H:i:s` strings, so Laravel and both apps read and write it as
-- before. MySQL converts each TIMESTAMP through the session time zone; no app sets one, so this
-- uses the same server default they all read with and every value keeps the string they see now.
-- A column type change rebuilds the table (both are small).
ALTER TABLE `player_update_requests` MODIFY COLUMN `birth_date` datetime;--> statement-breakpoint
ALTER TABLE `players` MODIFY COLUMN `birth_date` datetime;