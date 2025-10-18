import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseBacklog } from '../backlog.js';

const issuesUrl = new URL('../../../../backlog/issues.yaml', import.meta.url);
const issuesPath = fileURLToPath(issuesUrl);
const hasBacklogSnapshot = existsSync(issuesPath);

function loadBacklogIssues() {
  const content = readFileSync(issuesPath, 'utf8');
  return parseBacklog(content);
}

describe('backlog closed issues', () => {
  const maybeIt = hasBacklogSnapshot ? it : it.skip;

  maybeIt('marks WEB-03 and SDK-01 as DoD complete', () => {
    const issues = loadBacklogIssues();
    const byCode = new Map(issues.map((issue) => [issue.code, issue]));

    expect(byCode.get('WEB-03')?.dodComplete).toBe(true);
    expect(byCode.get('SDK-01')?.dodComplete).toBe(true);
  });

  if (!hasBacklogSnapshot) {
    // eslint-disable-next-line no-console
    console.warn(
      '[backlog-tools] Skipping closed issues snapshot assertions; backlog/issues.yaml not found.'
    );
  }
});
