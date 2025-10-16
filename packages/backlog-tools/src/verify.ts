import type { BacklogIssue, GithubGateway, VerificationResult } from './types.js';

interface VerifyOptions {
  readonly issues: readonly BacklogIssue[];
  readonly github: Pick<GithubGateway, 'findIssueByCode'>;
}

export async function verifyBacklog(options: VerifyOptions): Promise<VerificationResult> {
  const mismatches = [];
  let checked = 0;

  for (const issue of options.issues) {
    if (!issue.dodComplete) {
      continue;
    }

    checked += 1;
    const remote = await options.github.findIssueByCode(issue.code);

    if (!remote) {
      mismatches.push({
        code: issue.code,
        title: issue.title,
        reason: 'Issue not found on GitHub',
      });
      continue;
    }

    if (remote.state !== 'closed') {
      mismatches.push({
        code: issue.code,
        title: issue.title,
        reason: 'Issue still open on GitHub',
        issueUrl: remote.htmlUrl,
      });
    }
  }

  return {
    checked,
    mismatches,
  };
}
