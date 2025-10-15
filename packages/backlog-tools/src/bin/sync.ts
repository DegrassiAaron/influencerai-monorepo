/* eslint-disable no-console */
import { loadBacklogIssues } from '../backlog.js';
import { GithubClient } from '../github.js';
import { syncBacklog } from '../sync.js';

async function main(): Promise<void> {
  const backlogPath = process.env.BACKLOG_FILE ?? 'backlog/issues.yaml';
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required');
  }

  const token = process.env.GH_PAT_READ || process.env.GITHUB_TOKEN;
  const allowMissing = process.env.BACKLOG_SYNC_ALLOW_MISSING === '1';
  const issues = await loadBacklogIssues(backlogPath);
  const github = new GithubClient({ repository, token: token || undefined });

  const result = await syncBacklog({ issues, github });
  console.log(`Updated ${result.updated} issues; ${result.unchanged} already in sync.`);

  if (result.missing.length > 0) {
    console.error('Missing GitHub issues for backlog entries:');
    for (const issue of result.missing) {
      console.error(`- ${issue.code} (${issue.title})`);
    }

    if (!allowMissing) {
      throw new Error(`${result.missing.length} backlog issues are missing on GitHub.`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
