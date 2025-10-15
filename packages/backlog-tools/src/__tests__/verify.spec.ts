import { describe, expect, it, vi } from 'vitest';
import { verifyBacklog } from '../verify.js';
import type { BacklogIssue, GithubGateway } from '../types.js';

const BASE_ISSUES: BacklogIssue[] = [
  {
    code: 'TEST-01',
    title: 'TEST-01: Completed',
    body: '- [x] done',
    labels: [],
    assignees: [],
    milestone: undefined,
    dodComplete: true
  },
  {
    code: 'TEST-02',
    title: 'TEST-02: Not complete',
    body: '- [ ] pending',
    labels: [],
    assignees: [],
    milestone: undefined,
    dodComplete: false
  }
];

describe('verifyBacklog', () => {
  it('skips issues without completed DoD', async () => {
    const github: Pick<GithubGateway, 'findIssueByCode'> = {
      findIssueByCode: vi.fn().mockResolvedValue({
        number: 1,
        title: 'TEST-01: Completed',
        state: 'closed',
        body: '',
        labels: [],
        htmlUrl: 'https://example.com/1'
      })
    };

    const result = await verifyBacklog({ issues: BASE_ISSUES, github });
    expect(result.checked).toBe(1);
    expect(result.mismatches).toHaveLength(0);
    expect(github.findIssueByCode).toHaveBeenCalledTimes(1);
  });

  it('reports issues that are still open on GitHub', async () => {
    const github: Pick<GithubGateway, 'findIssueByCode'> = {
      findIssueByCode: vi.fn().mockResolvedValue({
        number: 10,
        title: 'TEST-01: Completed',
        state: 'open',
        body: '',
        labels: [],
        htmlUrl: 'https://example.com/10'
      })
    };

    const result = await verifyBacklog({ issues: BASE_ISSUES, github });
    expect(result.mismatches).toEqual([
      {
        code: 'TEST-01',
        title: 'TEST-01: Completed',
        reason: 'Issue still open on GitHub',
        issueUrl: 'https://example.com/10'
      }
    ]);
  });

  it('reports missing GitHub issues', async () => {
    const github: Pick<GithubGateway, 'findIssueByCode'> = {
      findIssueByCode: vi.fn().mockResolvedValue(null)
    };

    const result = await verifyBacklog({ issues: BASE_ISSUES, github });
    expect(result.mismatches).toEqual([
      {
        code: 'TEST-01',
        title: 'TEST-01: Completed',
        reason: 'Issue not found on GitHub'
      }
    ]);
  });
});
