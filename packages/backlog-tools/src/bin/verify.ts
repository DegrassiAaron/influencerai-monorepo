/* eslint-disable no-console */
import { loadBacklogIssues } from '../backlog.js';
import { GithubClient } from '../github.js';
import { verifyBacklog } from '../verify.js';

async function main(): Promise<void> {
  const backlogPath = process.env.BACKLOG_FILE ?? 'backlog/issues.yaml';
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required');
  }

  const token = process.env.GH_PAT_READ || process.env.GITHUB_TOKEN;
  const issues = await loadBacklogIssues(backlogPath);
  const github = new GithubClient({ repository, token: token || undefined });

  const result = await verifyBacklog({ issues, github });

  if (result.checked === 0) {
    console.log('No completed DoD items to verify.');
    return;
  }

  if (result.mismatches.length === 0) {
    console.log(`All ${result.checked} completed issues are closed on GitHub.`);
    return;
  }

  console.error('Detected backlog / GitHub mismatches:');
  for (const mismatch of result.mismatches) {
    console.error(
      `- ${mismatch.code}: ${mismatch.reason}${mismatch.issueUrl ? ` (${mismatch.issueUrl})` : ''}`
    );
  }

  throw new Error(`${result.mismatches.length} completed issues are not closed on GitHub.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
