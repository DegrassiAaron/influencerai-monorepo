import type { BacklogIssue, GithubGateway, GithubIssueReference, SyncResult } from './types.js';

interface SyncOptions {
  readonly issues: readonly BacklogIssue[];
  readonly github: GithubGateway;
}

export async function syncBacklog(options: SyncOptions): Promise<SyncResult> {
  const uniqueLabels = new Set<string>();
  for (const issue of options.issues) {
    for (const label of issue.labels) {
      uniqueLabels.add(label);
    }
  }

  await options.github.ensureLabels([...uniqueLabels]);

  let updated = 0;
  let unchanged = 0;
  const missing: BacklogIssue[] = [];

  for (const issue of options.issues) {
    const remote = await options.github.findIssueByCode(issue.code);
    if (!remote) {
      missing.push(issue);
      continue;
    }

    const needsUpdate = determineUpdates(issue, remote);
    if (!needsUpdate) {
      unchanged += 1;
      continue;
    }

    await options.github.updateIssue(remote.number, needsUpdate);
    updated += 1;
  }

  return {
    updated,
    unchanged,
    missing,
  };
}

function determineUpdates(
  issue: BacklogIssue,
  remote: GithubIssueReference
): Partial<Pick<GithubIssueReference, 'body' | 'labels' | 'title'>> | null {
  const desiredLabels = [...issue.labels].sort();
  const remoteLabels = [...remote.labels].sort();
  const labelsChanged = !areArraysEqual(desiredLabels, remoteLabels);
  const bodyChanged = normaliseLineEndings(remote.body) !== normaliseLineEndings(issue.body);
  const titleChanged = remote.title !== issue.title;

  if (!labelsChanged && !bodyChanged && !titleChanged) {
    return null;
  }

  const update: Partial<Pick<GithubIssueReference, 'body' | 'labels' | 'title'>> = {};
  if (labelsChanged) {
    update.labels = issue.labels;
  }

  if (bodyChanged) {
    update.body = issue.body;
  }

  if (titleChanged) {
    update.title = issue.title;
  }

  return update;
}

function normaliseLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function areArraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}
