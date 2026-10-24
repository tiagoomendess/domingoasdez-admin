import { isPorted, type JobDefinition, type PortedJob } from '../job.ts';
import * as cleanupTmpFolder from './cleanup-tmp-folder.ts';
import * as clubBirthdays from './club-birthdays.ts';
import * as deleteNotVerifiedAccounts from './delete-not-verified-accounts.ts';
import * as generateGameComments from './generate-game-comments.ts';
import * as generateGameImage from './generate-game-image.ts';
import * as playerGoalMilestones from './player-goal-milestones.ts';
import * as processDeleteRequests from './process-delete-requests.ts';
import * as processGameComments from './process-game-comments.ts';
import * as processPolls from './process-polls.ts';
import * as processScoreReportBans from './process-score-report-bans.ts';
import * as processUuidKarma from './process-uuid-karma.ts';
import * as publishSocialMedia from './publish-social-media.ts';
import * as scheduleSocialMedia from './schedule-social-media.ts';
import * as scoreReportConsumer from './score-report-consumer.ts';

/**
 * Every job of the legacy `App\Console\Kernel::schedule()`, with its schedule converted to cron
 * (UTC). Porting a job = adding its `run` from `./<name>.ts`; see docs/jobs.md for the order and
 * the cutover steps.
 */
export const jobs: readonly JobDefinition[] = [
	{
		name: 'publish-social-media',
		legacy: 'PublishSocialMedia',
		schedule: '* * * * *',
		run: publishSocialMedia.run
	},
	{
		name: 'score-report-consumer',
		legacy: 'ScoreReportConsumer',
		schedule: '* * * * *',
		run: scoreReportConsumer.run
	},
	{
		name: 'generate-game-comments',
		legacy: 'GenerateGameComments',
		schedule: '* * * * *',
		run: generateGameComments.run
	},
	{
		name: 'generate-game-image',
		legacy: 'GenerateGameImage',
		schedule: '* * * * *',
		run: generateGameImage.run
	},
	{
		name: 'process-polls',
		legacy: 'ProcessPolls',
		schedule: '* * * * *',
		run: processPolls.run
	},
	{
		name: 'delete-not-verified-accounts',
		legacy: 'DeleteNotVerifiedAccounts',
		schedule: '*/10 * * * *',
		run: deleteNotVerifiedAccounts.run
	},
	{
		name: 'process-delete-requests',
		legacy: 'ProcessDeleteRequest',
		schedule: '0 1 * * *',
		run: processDeleteRequests.run
	},
	{
		name: 'process-game-comments',
		legacy: 'ProcessGameComments',
		schedule: '15 1 * * *',
		run: processGameComments.run
	},
	{
		name: 'process-uuid-karma',
		legacy: 'ProcessUuidKarma',
		schedule: '15 2 * * *',
		run: processUuidKarma.run
	},
	{
		name: 'club-birthdays',
		legacy: 'ClubBirthdays',
		schedule: '0 3 * * *',
		run: clubBirthdays.run
	},
	{
		name: 'cleanup-tmp-folder',
		legacy: 'CleanupTmpFolder',
		schedule: '0 4 * * *',
		run: cleanupTmpFolder.run
	},
	{
		name: 'player-goal-milestones',
		legacy: 'PlayerGoalMilestones',
		schedule: '0 5 * * *',
		run: playerGoalMilestones.run
	},
	{
		name: 'schedule-social-media',
		legacy: 'ScheduleSocialMedia',
		schedule: '15 5 * * *',
		run: scheduleSocialMedia.run
	},
	{
		name: 'process-score-report-bans',
		legacy: 'ProcessScoreReportBans',
		schedule: '59 22 * * *',
		run: processScoreReportBans.run
	}
];

export function findJob(name: string, registry: readonly JobDefinition[] = jobs) {
	return registry.find((job) => job.name === name);
}

/**
 * The jobs WORKER_JOBS enables. `all` is every ported job; a name that is unknown or not ported
 * yet throws, so a typo or a premature cutover stops the worker instead of silently running
 * nothing (the legacy site would no longer run it either).
 */
export function selectJobs(
	selection: 'all' | string[],
	registry: readonly JobDefinition[] = jobs
): PortedJob[] {
	if (selection === 'all') return registry.filter(isPorted);

	return [...new Set(selection)].map((name) => {
		const job = findJob(name, registry);
		if (!job) throw new Error(`WORKER_JOBS: unknown job "${name}" (see npm run worker -- list)`);
		if (!isPorted(job)) throw new Error(`WORKER_JOBS: "${name}" is not ported yet`);
		return job;
	});
}
