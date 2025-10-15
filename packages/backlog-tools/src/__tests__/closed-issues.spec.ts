import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBacklog } from '../backlog.js';

function loadBacklogIssues() {
  const content = readFileSync(new URL('../../../../backlog/issues.yaml', import.meta.url), 'utf8');
  return parseBacklog(content);
}

describe('backlog closed issues', () => {
  it('marks WEB-03 and SDK-01 as DoD complete', () => {
    const issues = loadBacklogIssues();
    const byCode = new Map(issues.map((issue) => [issue.code, issue]));

    expect(byCode.get('WEB-03')?.dodComplete).toBe(true);
    expect(byCode.get('SDK-01')?.dodComplete).toBe(true);
  });
});
