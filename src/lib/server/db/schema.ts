/**
 * Schema of the database shared with the legacy Laravel site and domingoasdez-app. It was built
 * by the Laravel migrations (E:\Projetos\DomingoAsDez\database\migrations) up to
 * drizzle/migrations/0000_baseline.sql; this file is now the source of truth.
 *
 * First generated with `drizzle-kit pull` and then curated:
 * - `tinyint(1)` flags are `boolean()`
 * - TIMESTAMP / DATETIME columns are `Date` (UTC); calendar dates stay strings
 * - `created_at` / `updated_at` are filled automatically (see ./columns.ts)
 * - the `migrations` table is left out
 *
 * Change it through migrations: edit this file, then `npm run db:generate -- --name <what>` and
 * review the SQL (docs/architecture.md, "Migrations"). Never `drizzle-kit push`. Tables keep the
 * order and names of the introspection output so `npm run db:pull` diffs stay readable.
 */
import {
	bigint,
	boolean,
	char,
	date,
	datetime,
	decimal,
	foreignKey,
	index,
	int,
	json,
	longtext,
	mysqlEnum,
	mysqlTable,
	text,
	timestamp,
	tinyint,
	unique,
	varchar
} from 'drizzle-orm/mysql-core';
import { latLngPoint, timestamps } from './columns';

export const playerPositions = ['none', 'striker', 'midfielder', 'defender', 'goalkeeper'] as const;
export const teamAgentTypes = [
	'manager',
	'assistant_manager',
	'goalkeeper_manager',
	'director'
] as const;

/** Up/down votes on article comments: one per user and comment, `value` is +1 or -1. */
export const articleCommentVotes = mysqlTable(
	'article_comment_votes',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		articleCommentId: int('article_comment_id', { unsigned: true })
			.notNull()
			.references(() => articleComments.id, { onDelete: 'cascade' }),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		value: tinyint('value').notNull(),
		...timestamps
	},
	(table) => [
		unique('article_comment_votes_article_comment_id_user_id_unique').on(
			table.articleCommentId,
			table.userId
		)
	]
);

export const articleComments = mysqlTable(
	'article_comments',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		articleId: int('article_id', { unsigned: true })
			.notNull()
			.references(() => articles.id, { onDelete: 'cascade' }),
		articleCommentId: int('article_comment_id', { unsigned: true }),
		content: text('content'),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		...timestamps,
		deleted: boolean('deleted').notNull().default(false)
	},
	(table) => [
		foreignKey({
			columns: [table.articleCommentId],
			foreignColumns: [table.id],
			name: 'article_comments_article_comment_id_foreign'
		}).onDelete('cascade')
	]
);

export const articles = mysqlTable('articles', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	mediaId: int('media_id', { unsigned: true }).references(() => media.id, {
		onDelete: 'cascade'
	}),
	title: varchar('title', { length: 155 }).notNull(),
	description: text('description'),
	text: longtext('text').notNull(),
	userId: int('user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	date: timestamp('date').notNull().defaultNow(),
	tags: text('tags'),
	visible: boolean('visible').notNull().default(true),
	facebookPostId: varchar('facebook_post_id', { length: 144 }),
	...timestamps
});

/** Activity log shared with the legacy backoffice. Write through `audit()` in `$lib/server/audit`. */
export const audit = mysqlTable(
	'audit',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		userId: bigint('user_id', { mode: 'number', unsigned: true }),
		action: varchar('action', { length: 25 }).notNull(),
		model: varchar('model', { length: 50 }),
		modelId: bigint('model_id', { mode: 'number', unsigned: true }),
		oldValues: text('old_values'),
		newValues: text('new_values'),
		ipAddress: varchar('ip_address', { length: 45 }),
		ipCountry: varchar('ip_country', { length: 155 }),
		userAgent: varchar('user_agent', { length: 255 }),
		timezone: varchar('timezone', { length: 30 }),
		language: varchar('language', { length: 155 }),
		extraInfo: varchar('extra_info', { length: 155 }),
		...timestamps
	},
	(table) => [
		index('audit_user_id_index').on(table.userId),
		index('audit_action_index').on(table.action),
		index('audit_model_index').on(table.model)
	]
);

export const clubs = mysqlTable('clubs', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 155 }).notNull(),
	foundingDate: date('founding_date', { mode: 'string' }),
	birthdayPostEnabled: boolean('birthday_post_enabled').notNull().default(true),
	contactEmail: varchar('contact_email', { length: 155 }),
	notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
	adminUserId: int('admin_user_id', { unsigned: true }).references(() => users.id, {
		onDelete: 'cascade'
	}),
	emblem: text('emblem'),
	website: varchar('website', { length: 155 }),
	visible: boolean('visible').notNull().default(true),
	priority: int('priority', { unsigned: true }).notNull().default(0),
	...timestamps
});

export const competitions = mysqlTable('competitions', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 155 }).notNull(),
	picture: text('picture'),
	visible: boolean('visible').notNull().default(true),
	socialMediaEnabled: boolean('social_media_enabled').notNull().default(true),
	priority: int('priority', { unsigned: true }).notNull().default(0),
	...timestamps
});

export const deleteRequests = mysqlTable('delete_requests', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	userId: int('user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	verificationCode: varchar('verification_code', { length: 155 }).notNull(),
	verified: boolean('verified').notNull().default(false),
	cancelled: boolean('cancelled').notNull().default(false),
	processed: boolean('processed').notNull().default(false),
	motive: text('motive'),
	...timestamps
});

export const emailOutbox = mysqlTable('email_outbox', {
	id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
	from: varchar('from', { length: 155 }),
	to: text('to'),
	cc: text('cc'),
	bcc: text('bcc'),
	subject: varchar('subject', { length: 255 }),
	body: longtext('body'),
	headers: text('headers'),
	attachments: text('attachments'),
	...timestamps
});

/** Flash interviews. */
export const gameComments = mysqlTable(
	'game_comments',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		uuid: char('uuid', { length: 36 }).notNull(),
		pin: char('pin', { length: 4 }).notNull(),
		gameId: int('game_id', { unsigned: true })
			.notNull()
			.references(() => games.id, { onDelete: 'cascade' }),
		teamId: int('team_id', { unsigned: true })
			.notNull()
			.references(() => teams.id, { onDelete: 'cascade' }),
		userId: int('user_id', { unsigned: true }).references(() => users.id, {
			onDelete: 'cascade'
		}),
		content: text('content').notNull(),
		used: boolean('used').notNull().default(false),
		deadline: timestamp('deadline').notNull().defaultNow(),
		// Unlike the other tables, the live columns got MySQL defaults when Laravel created them.
		createdAt: timestamp('created_at')
			.defaultNow()
			.$defaultFn(() => new Date()),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.onUpdateNow()
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date())
	},
	(table) => [
		index('game_comments_team_id_index').on(table.teamId),
		index('game_comments_game_id_index').on(table.gameId),
		index('game_comments_deadline_index').on(table.deadline),
		unique('game_comments_uuid_unique').on(table.uuid)
	]
);

export const gameGroups = mysqlTable('game_groups', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 155 }),
	seasonId: int('season_id', { unsigned: true })
		.notNull()
		.references(() => seasons.id, { onDelete: 'cascade' }),
	groupRulesId: int('group_rules_id', { unsigned: true })
		.notNull()
		.references(() => groupRules.id, { onDelete: 'cascade' }),
	...timestamps
});

/**
 * Score predictions on the public game page: one per user and game, editable until kick-off.
 * `penalty_winner` is only set for elimination games predicted to end level.
 */
export const gamePredictions = mysqlTable(
	'game_predictions',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		gameId: int('game_id', { unsigned: true })
			.notNull()
			.references(() => games.id, { onDelete: 'cascade' }),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		goalsHome: tinyint('goals_home', { unsigned: true }).notNull(),
		goalsAway: tinyint('goals_away', { unsigned: true }).notNull(),
		penaltyWinner: mysqlEnum('penalty_winner', ['home', 'away']),
		...timestamps
	},
	(table) => [unique('game_predictions_game_id_user_id_unique').on(table.gameId, table.userId)]
);

export const gameReferees = mysqlTable('game_referees', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	gameId: int('game_id', { unsigned: true })
		.notNull()
		.references(() => games.id, { onDelete: 'cascade' }),
	refereeId: int('referee_id', { unsigned: true })
		.notNull()
		.references(() => referees.id, { onDelete: 'cascade' }),
	refereeTypeId: int('referee_type_id', { unsigned: true })
		.notNull()
		.references(() => refereeTypes.id, { onDelete: 'cascade' }),
	...timestamps
});

export const games = mysqlTable('games', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	homeTeamId: int('home_team_id', { unsigned: true })
		.notNull()
		.references(() => teams.id, { onDelete: 'cascade' }),
	awayTeamId: int('away_team_id', { unsigned: true })
		.notNull()
		.references(() => teams.id, { onDelete: 'cascade' }),
	gameGroupId: int('game_group_id', { unsigned: true })
		.notNull()
		.references(() => gameGroups.id, { onDelete: 'cascade' }),
	round: int('round').notNull(),
	date: timestamp('date').notNull().defaultNow(),
	playgroundId: int('playground_id', { unsigned: true }).references(() => playgrounds.id, {
		onDelete: 'cascade'
	}),
	goalsHome: int('goals_home'),
	goalsAway: int('goals_away'),
	penaltiesHome: int('penalties_home'),
	penaltiesAway: int('penalties_away'),
	finished: boolean('finished').notNull().default(false),
	visible: boolean('visible').notNull().default(true),
	postponed: boolean('postponed').notNull().default(false),
	image: varchar('image', { length: 255 }),
	generateImage: boolean('generate_image').notNull().default(false),
	scoreboardUpdates: boolean('scoreboard_updates').notNull().default(true),
	...timestamps
});

export const goals = mysqlTable('goals', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	playerId: int('player_id', { unsigned: true }).references(() => players.id, {
		onDelete: 'cascade'
	}),
	teamId: int('team_id', { unsigned: true })
		.notNull()
		.references(() => teams.id, { onDelete: 'cascade' }),
	gameId: int('game_id', { unsigned: true })
		.notNull()
		.references(() => games.id, { onDelete: 'cascade' }),
	ownGoal: boolean('own_goal').notNull().default(false),
	penalty: boolean('penalty').notNull().default(false),
	minute: int('minute'),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

export const groupRules = mysqlTable(
	'group_rules',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		name: varchar('name', { length: 155 }).notNull(),
		promotes: int('promotes').notNull().default(0),
		relegates: int('relegates').notNull().default(0),
		type: mysqlEnum('type', ['points', 'elimination', 'friendly', 'other']).notNull(),
		tieBreakerScript: text('tie_breaker_script'),
		...timestamps
	},
	(table) => [unique('group_rules_name_unique').on(table.name)]
);

export const groupRulesPositions = mysqlTable('group_rules_positions', {
	id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
	groupRulesId: int('group_rules_id', { unsigned: true })
		.notNull()
		.references(() => groupRules.id, { onDelete: 'cascade' }),
	positions: varchar('positions', { length: 155 }).notNull(),
	color: varchar('color', { length: 155 }).notNull(),
	label: varchar('label', { length: 155 }).notNull(),
	...timestamps
});

export const honeyPotCatches = mysqlTable(
	'honey_pot_catches',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		ipAddress: varchar('ip_address', { length: 39 }).notNull(),
		ipCountry: varchar('ip_country', { length: 2 }),
		userAgent: varchar('user_agent', { length: 255 }).notNull(),
		route: varchar('route', { length: 155 }).notNull(),
		httpMethod: varchar('http_method', { length: 10 }).notNull(),
		queryParams: varchar('query_params', { length: 500 }).notNull(),
		headers: text('headers').notNull(),
		cookies: text('cookies').notNull(),
		...timestamps
	},
	(table) => [
		index('honey_pot_catches_ip_address_index').on(table.ipAddress),
		index('honey_pot_catches_ip_country_index').on(table.ipCountry),
		index('honey_pot_catches_route_index').on(table.route),
		index('honey_pot_catches_http_method_index').on(table.httpMethod)
	]
);

export const idempotencyRecords = mysqlTable('idempotency_records', {
	key: varchar('key', { length: 36 }).primaryKey(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const infoReportStatuses = ['sent', 'seen', 'used', 'archived', 'deleted'] as const;

export const infoReports = mysqlTable(
	'info_reports',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		code: varchar('code', { length: 12 }).notNull(),
		userId: int('user_id', { unsigned: true }),
		status: mysqlEnum('status', infoReportStatuses).notNull(),
		content: varchar('content', { length: 500 }).notNull(),
		source: varchar('source', { length: 155 }).notNull(),
		...timestamps
	},
	(table) => [unique('info_reports_code_unique').on(table.code)]
);

/**
 * Comments on a game by signed-in users (domingoasdez-app game page). Not the flash interviews,
 * which are `game_comments`. Same shape as `article_comments`: one level of replies, soft delete.
 */
export const matchComments = mysqlTable(
	'match_comments',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		gameId: int('game_id', { unsigned: true })
			.notNull()
			.references(() => games.id, { onDelete: 'cascade' }),
		/** Parent comment for replies; null for a top-level comment. */
		matchCommentId: int('match_comment_id', { unsigned: true }),
		/** Nullable so an account deletion can wipe it, as with `article_comments`. */
		content: text('content'),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		deleted: boolean('deleted').notNull().default(false),
		...timestamps
	},
	(table) => [
		index('match_comments_game_id_created_at_index').on(table.gameId, table.createdAt),
		foreignKey({
			columns: [table.matchCommentId],
			foreignColumns: [table.id],
			name: 'match_comments_match_comment_id_foreign'
		}).onDelete('cascade')
	]
);

/** Up/down votes on match comments: one per user and comment, `value` is +1 or -1. */
export const matchCommentVotes = mysqlTable(
	'match_comment_votes',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		matchCommentId: int('match_comment_id', { unsigned: true })
			.notNull()
			.references(() => matchComments.id, { onDelete: 'cascade' }),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		value: tinyint('value').notNull(),
		...timestamps
	},
	(table) => [
		unique('match_comment_votes_match_comment_id_user_id_unique').on(
			table.matchCommentId,
			table.userId
		)
	]
);

export const mediaTypes = ['none', 'image', 'video', 'youtube', 'download', 'other'] as const;

export const media = mysqlTable('media', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	userId: int('user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	url: text('url').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	mediaType: mysqlEnum('media_type', mediaTypes).notNull(),
	tags: text('tags'),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

export const mvpVotes = mysqlTable('mvp_votes', {
	id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
	gameId: int('game_id', { unsigned: true })
		.notNull()
		.references(() => games.id, { onDelete: 'cascade' }),
	playerId: int('player_id', { unsigned: true })
		.notNull()
		.references(() => players.id, { onDelete: 'cascade' }),
	userId: int('user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	...timestamps
});

export const pages = mysqlTable(
	'pages',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		name: varchar('name', { length: 155 }).notNull(),
		slug: varchar('slug', { length: 155 }).notNull(),
		title: varchar('title', { length: 155 }).notNull(),
		picture: varchar('picture', { length: 155 }).notNull(),
		body: text('body').notNull(),
		visible: boolean('visible').notNull().default(true),
		...timestamps
	},
	(table) => [unique('pages_slug_unique').on(table.slug)]
);

export const partnerClicks = mysqlTable('partner_clicks', {
	id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
	partnerId: int('partner_id', { unsigned: true }).notNull(),
	page: varchar('page', { length: 155 }),
	...timestamps
});

/** Direct-sold ads. Lower `priority` is shown first. */
export const partners = mysqlTable('partners', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull(),
	url: varchar('url', { length: 150 }).notNull(),
	picture: varchar('picture', { length: 255 }).notNull(),
	priority: int('priority', { unsigned: true }).notNull(),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

export const passwordResets = mysqlTable(
	'password_resets',
	{
		email: varchar('email', { length: 155 }).notNull(),
		token: varchar('token', { length: 155 }).notNull(),
		createdAt: timestamp('created_at')
	},
	(table) => [index('password_resets_email_index').on(table.email)]
);

export const permissions = mysqlTable('permissions', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 155 }).notNull(),
	...timestamps
});

/**
 * Log of what happened on a stadium screen (`placards`): pairing, every controller action, the
 * screen being released. Written by domingoasdez-app; `type` is the action name.
 */
export const placardEvents = mysqlTable(
	'placard_events',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		placardId: int('placard_id', { unsigned: true })
			.notNull()
			.references(() => placards.id, { onDelete: 'cascade' }),
		gameId: int('game_id', { unsigned: true }).references(() => games.id, {
			onDelete: 'set null'
		}),
		userId: int('user_id', { unsigned: true }).references(() => users.id, {
			onDelete: 'set null'
		}),
		type: varchar('type', { length: 30 }).notNull(),
		payload: json('payload'),
		createdAt: timestamp('created_at').$defaultFn(() => new Date())
	},
	(table) => [
		index('placard_events_placard_id_created_at_index').on(table.placardId, table.createdAt)
	]
);

/**
 * Stadium screens ("placard eletrónico"), one per TV browser, holding the live state the screen
 * shows. Owned by domingoasdez-app: the TV keeps a token in a cookie (only its sha256 is stored),
 * shows `pairing_code` as a QR, and a signed-in phone pairs it with a game and controls it.
 * - `scene` is what the screen shows: `pairing` or `match` (more to come, e.g. ad breaks)
 * - the clock is server time: `clock_elapsed_ms` plus, while running, the time since
 *   `clock_running_since`
 * - `version` goes up on every change; the screen polls with it
 */
export const placards = mysqlTable('placards', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	deviceTokenHash: char('device_token_hash', { length: 64 }).notNull().unique(),
	pairingCode: char('pairing_code', { length: 6 }).unique(),
	pairingCodeExpiresAt: datetime('pairing_code_expires_at'),
	scene: varchar('scene', { length: 20 }).notNull().default('pairing'),
	gameId: int('game_id', { unsigned: true }).references(() => games.id, { onDelete: 'set null' }),
	controllerUserId: int('controller_user_id', { unsigned: true }).references(() => users.id, {
		onDelete: 'set null'
	}),
	homeScore: tinyint('home_score', { unsigned: true }).notNull().default(0),
	awayScore: tinyint('away_score', { unsigned: true }).notNull().default(0),
	period: varchar('period', { length: 20 }).notNull().default('first_half'),
	clockElapsedMs: int('clock_elapsed_ms', { unsigned: true }).notNull().default(0),
	clockRunningSince: datetime('clock_running_since', { fsp: 3 }),
	version: int('version', { unsigned: true }).notNull().default(0),
	pairedAt: datetime('paired_at'),
	lastActionAt: datetime('last_action_at'),
	lastSeenAt: datetime('last_seen_at'),
	...timestamps
});

export const playerUpdateRequestStatuses = ['pending', 'approved', 'denied'] as const;

export const playerUpdateRequests = mysqlTable(
	'player_update_requests',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		playerId: int('player_id', { unsigned: true }).references(() => players.id, {
			onDelete: 'cascade'
		}),
		name: varchar('name', { length: 155 }),
		nickname: varchar('nickname', { length: 155 }),
		clubName: varchar('club_name', { length: 155 }),
		team: varchar('team', { length: 155 }),
		pictureUrl: text('picture_url'),
		associationId: varchar('association_id', { length: 155 }),
		phone: varchar('phone', { length: 155 }),
		email: varchar('email', { length: 155 }),
		facebookProfile: text('facebook_profile'),
		/**
		 * Calendar date stored as `YYYY-MM-DD 00:00:00`; kept as a string to avoid timezone shifts.
		 * DATETIME, not TIMESTAMP: TIMESTAMP can't hold dates before 1970.
		 */
		birthDate: datetime('birth_date', { mode: 'string' }),
		position: mysqlEnum('position', playerPositions),
		obs: text('obs'),
		status: mysqlEnum('status', playerUpdateRequestStatuses).notNull().default('pending'),
		createdBy: varchar('created_by', { length: 155 }),
		reviewedBy: int('reviewed_by', { unsigned: true }).references(() => users.id, {
			onDelete: 'set null'
		}),
		reviewedAt: timestamp('reviewed_at'),
		reviewNotes: text('review_notes'),
		sourceData: text('source_data'),
		...timestamps
	},
	(table) => [
		index('player_update_requests_player_id_index').on(table.playerId),
		index('player_update_requests_status_index').on(table.status),
		index('player_update_requests_created_by_index').on(table.createdBy),
		index('player_update_requests_reviewed_by_index').on(table.reviewedBy)
	]
);

export const players = mysqlTable(
	'players',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		name: varchar('name', { length: 155 }).notNull(),
		picture: text('picture'),
		associationId: varchar('association_id', { length: 155 }),
		nickname: varchar('nickname', { length: 155 }),
		phone: varchar('phone', { length: 155 }),
		email: varchar('email', { length: 155 }),
		facebookProfile: text('facebook_profile'),
		obs: text('obs'),
		/**
		 * Calendar date stored as `YYYY-MM-DD 00:00:00`; kept as a string to avoid timezone shifts.
		 * DATETIME, not TIMESTAMP: TIMESTAMP can't hold dates before 1970.
		 */
		birthDate: datetime('birth_date', { mode: 'string' }),
		position: mysqlEnum('position', playerPositions).notNull().default('none'),
		teamId: int('team_id', { unsigned: true }).references(() => teams.id, {
			onDelete: 'set null'
		}),
		visible: boolean('visible').notNull().default(true),
		...timestamps
	},
	(table) => [unique('players_association_id_unique').on(table.associationId)]
);

export const playgrounds = mysqlTable('playgrounds', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	clubId: int('club_id', { unsigned: true }).references(() => clubs.id, {
		onDelete: 'cascade'
	}),
	name: varchar('name', { length: 155 }).notNull(),
	surface: varchar('surface', { length: 155 }).notNull(),
	width: int('width'),
	height: int('height'),
	capacity: int('capacity'),
	picture: text('picture'),
	obs: text('obs'),
	location: latLngPoint('location'),
	visible: boolean('visible').notNull().default(true),
	priority: int('priority', { unsigned: true }).notNull().default(0),
	...timestamps
});

export const pollAnswerVotes = mysqlTable(
	'poll_answer_votes',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		pollAnswerId: int('poll_answer_id', { unsigned: true })
			.notNull()
			.references(() => pollAnswers.id, { onDelete: 'cascade' }),
		userId: int('user_id', { unsigned: true }).references(() => users.id, {
			onDelete: 'cascade'
		}),
		ip: varchar('ip', { length: 70 }),
		...timestamps
	},
	(table) => [index('poll_answer_votes_ip_user_id_index').on(table.ip, table.userId)]
);

export const pollAnswers = mysqlTable('poll_answers', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	pollId: int('poll_id', { unsigned: true })
		.notNull()
		.references(() => polls.id, { onDelete: 'cascade' }),
	answer: varchar('answer', { length: 144 }).notNull(),
	...timestamps
});

export const polls = mysqlTable(
	'polls',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		question: varchar('question', { length: 144 }).notNull(),
		slug: varchar('slug', { length: 150 }).notNull(),
		showResultsAfter: datetime('show_results_after').notNull(),
		publishAfter: datetime('publish_after').notNull(),
		closeAfter: datetime('close_after').notNull(),
		image: varchar('image', { length: 255 }),
		updateImage: boolean('update_image').notNull().default(true),
		visible: boolean('visible').notNull().default(false),
		...timestamps
	},
	(table) => [unique('polls_slug_unique').on(table.slug)]
);

export const refereeTypes = mysqlTable('referee_types', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 155 }).notNull(),
	...timestamps
});

export const referees = mysqlTable('referees', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	name: varchar('name', { length: 155 }).notNull(),
	picture: text('picture'),
	obs: text('obs'),
	association: varchar('association', { length: 155 }).notNull().default('none'),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

export const scoreReportBans = mysqlTable(
	'score_report_bans',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		userId: int('user_id', { unsigned: true }),
		ipAddress: varchar('ip_address', { length: 45 }),
		uuid: varchar('uuid', { length: 40 }),
		userAgent: varchar('user_agent', { length: 255 }),
		shadowBan: boolean('shadow_ban').notNull().default(false),
		ipBan: boolean('ip_ban').notNull().default(false),
		reason: varchar('reason', { length: 255 }),
		expiresAt: timestamp('expires_at'),
		...timestamps
	},
	(table) => [
		index('score_report_bans_ip_address_index').on(table.ipAddress),
		index('score_report_bans_uuid_index').on(table.uuid)
	]
);

export const scoreReports = mysqlTable(
	'score_reports',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		userId: int('user_id', { unsigned: true }),
		gameId: int('game_id', { unsigned: true }).notNull(),
		homeScore: tinyint('home_score', { unsigned: true }).notNull(),
		awayScore: tinyint('away_score', { unsigned: true }).notNull(),
		source: varchar('source', { length: 25 }).notNull(),
		ipAddress: varchar('ip_address', { length: 45 }),
		ipCountry: varchar('ip_country', { length: 155 }),
		userAgent: varchar('user_agent', { length: 255 }),
		location: latLngPoint('location'),
		locationAccuracy: decimal('location_accuracy', { precision: 8, scale: 4, mode: 'number' }),
		uuid: varchar('uuid', { length: 40 }),
		finished: boolean('finished').notNull().default(false),
		isFake: boolean('is_fake').notNull().default(false),
		isCorrect: boolean('is_correct').notNull().default(false),
		...timestamps
	},
	(table) => [
		index('score_reports_game_id_index').on(table.gameId),
		index('score_reports_source_index').on(table.source),
		index('score_reports_ip_address_index').on(table.ipAddress),
		index('score_reports_uuid_index').on(table.uuid)
	]
);

export const seasons = mysqlTable('seasons', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	competitionId: int('competition_id', { unsigned: true })
		.notNull()
		.references(() => competitions.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 155 }),
	picture: text('picture'),
	startYear: int('start_year').notNull(),
	endYear: int('end_year').notNull(),
	obs: text('obs'),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

/** Queue consumed by the legacy scheduler (PublishSocialMedia job). */
export const socialMediaPosts = mysqlTable(
	'social_media_posts',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		published: boolean('published').notNull().default(false),
		publishAt: timestamp('publish_at').notNull(),
		platform: mysqlEnum('platform', ['facebook', 'instagram']).notNull().default('facebook'),
		postType: mysqlEnum('post_type', ['post', 'story']).notNull().default('post'),
		postContentType: mysqlEnum('post_content_type', ['text', 'image', 'video']).notNull(),
		textContent: varchar('text_content', { length: 512 }),
		mediaPath: varchar('media_path', { length: 512 }),
		errorMessage: varchar('error_message', { length: 1024 }),
		mediaExternalId: varchar('media_external_id', { length: 128 }),
		postId: varchar('post_id', { length: 128 }),
		...timestamps
	},
	(table) => [
		index('social_media_posts_published_index').on(table.published),
		index('social_media_posts_publish_at_index').on(table.publishAt),
		index('social_media_posts_media_external_id_index').on(table.mediaExternalId)
	]
);

export const socialProviders = mysqlTable('social_providers', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	userId: int('user_id', { unsigned: true }).notNull(),
	providerId: varchar('provider_id', { length: 155 }).notNull(),
	provider: varchar('provider', { length: 155 }).notNull(),
	...timestamps
});

export const teamAgents = mysqlTable('team_agents', {
	id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
	playerId: int('player_id', { unsigned: true }).references(() => players.id),
	teamId: int('team_id', { unsigned: true }).references(() => teams.id),
	name: varchar('name', { length: 155 }).notNull(),
	/** Free text in the legacy schema (VARCHAR), not a DATE. */
	birthDate: varchar('birth_date', { length: 155 }),
	externalId: varchar('external_id', { length: 155 }),
	email: varchar('email', { length: 155 }),
	phone: varchar('phone', { length: 155 }),
	picture: varchar('picture', { length: 155 }),
	agentType: mysqlEnum('agent_type', teamAgentTypes).notNull().default('manager'),
	...timestamps
});

export const teamAgentsHistory = mysqlTable('team_agents_history', {
	id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
	teamAgentId: bigint('team_agent_id', { mode: 'number', unsigned: true })
		.notNull()
		.references(() => teamAgents.id),
	teamId: int('team_id', { unsigned: true }),
	agentType: mysqlEnum('agent_type', teamAgentTypes).notNull().default('manager'),
	startedAt: timestamp('started_at').notNull().defaultNow(),
	...timestamps
});

export const teams = mysqlTable('teams', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	clubId: int('club_id', { unsigned: true })
		.notNull()
		.references(() => clubs.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 155 }).notNull(),
	contactEmail: varchar('contact_email', { length: 155 }),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

export const transfers = mysqlTable('transfers', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	playerId: int('player_id', { unsigned: true })
		.notNull()
		.references(() => players.id, { onDelete: 'cascade' }),
	teamId: int('team_id', { unsigned: true }).references(() => teams.id, { onDelete: 'cascade' }),
	date: timestamp('date').notNull().defaultNow(),
	visible: boolean('visible').notNull().default(true),
	...timestamps
});

export const userBans = mysqlTable('user_bans', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	bannedUserId: int('banned_user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	reason: varchar('reason', { length: 155 }).notNull(),
	bannedByUserId: int('banned_by_user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	pardoned: boolean('pardoned').notNull().default(false),
	...timestamps
});

export const userPermissions = mysqlTable('user_permissions', {
	id: int('id', { unsigned: true }).autoincrement().primaryKey(),
	userId: int('user_id', { unsigned: true })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	permissionId: int('permission_id', { unsigned: true })
		.notNull()
		.references(() => permissions.id, { onDelete: 'cascade' }),
	...timestamps
});

export const userProfiles = mysqlTable(
	'user_profiles',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		phone: varchar('phone', { length: 20 }),
		bio: text('bio'),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		picture: text('picture'),
		accountDataConsent: timestamp('account_data_consent'),
		analyticsCookiesConsent: timestamp('analytics_cookies_consent'),
		allDataConsent: timestamp('all_data_consent'),
		timezone: varchar('timezone', { length: 20 }).notNull().default('Europe/Lisbon'),
		...timestamps
	},
	(table) => [unique('user_profiles_user_id_unique').on(table.userId)]
);

export const userUuids = mysqlTable(
	'user_uuids',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
		userId: int('user_id', { unsigned: true })
			.notNull()
			.references(() => users.id),
		uuid: varchar('uuid', { length: 36 }).notNull(),
		...timestamps
	},
	(table) => [index('user_uuids_uuid_index').on(table.uuid)]
);

export const users = mysqlTable(
	'users',
	{
		id: int('id', { unsigned: true }).autoincrement().primaryKey(),
		name: varchar('name', { length: 155 }),
		email: varchar('email', { length: 155 }),
		/** Laravel bcrypt hash (`$2y$`). See `$lib/server/auth/password`. */
		password: varchar('password', { length: 155 }),
		emailToken: varchar('email_token', { length: 20 }),
		verified: boolean('verified').notNull().default(false),
		rememberToken: varchar('remember_token', { length: 100 }),
		...timestamps
	},
	(table) => [unique('users_email_unique').on(table.email)]
);

export const uuidKarmas = mysqlTable('uuid_karmas', {
	uuid: varchar('uuid', { length: 36 }).primaryKey(),
	karma: int('karma').notNull().default(0),
	...timestamps
});

/** Key/value settings read by the legacy site (SettingsController). */
export const variables = mysqlTable('variables', {
	name: varchar('name', { length: 64 }).primaryKey(),
	value: text('value').notNull(),
	...timestamps
});
