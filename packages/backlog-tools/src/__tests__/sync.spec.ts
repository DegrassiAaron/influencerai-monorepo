import { describe, expect, it, vi } from 'vitest';
import { syncBacklog } from '../sync.js';
import type { BacklogIssue, GithubGateway, GithubIssueReference } from '../types.js';

const ISSUE: BacklogIssue = {
  code: 'SYNC-01',
  title: 'SYNC-01: Example',
  body: 'line1\n- [x] done',
  labels: ['priority:P1', 'area:web'],
  assignees: [],
  milestone: undefined,
  dodComplete: true
};

describe('syncBacklog', () => {
  it('creates missing labels and updates issues when content differs', async () => {
    const github: GithubGateway = {
      ensureLabels: vi.fn().mockResolvedValue(undefined),
      findIssueByCode: vi.fn().mockResolvedValue<GithubIssueReference>({
        number: 42,
        title: 'SYNC-01: Example',
        state: 'closed',
        body: 'line1\n- [ ] todo',
        labels: ['priority:P1'],
        htmlUrl: 'https://example.com/42'
      }),
      updateIssue: vi.fn().mockResolvedValue(undefined)
    };

    const result = await syncBacklog({ issues: [ISSUE], github });
    expect(github.ensureLabels).toHaveBeenCalledWith(['priority:P1', 'area:web']);
    expect(github.updateIssue).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        labels: ISSUE.labels,
        body: ISSUE.body
      })
    );
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it('marks issues as missing when not found', async () => {
    const github: GithubGateway = {
      ensureLabels: vi.fn().mockResolvedValue(undefined),
      findIssueByCode: vi.fn().mockResolvedValue(null),
      updateIssue: vi.fn().mockResolvedValue(undefined)
    };

    const result = await syncBacklog({ issues: [ISSUE], github });
    expect(result.missing).toEqual([ISSUE]);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
  });

  it('avoids unnecessary updates when issue already matches', async () => {
    const github: GithubGateway = {
      ensureLabels: vi.fn().mockResolvedValue(undefined),
      findIssueByCode: vi.fn().mockResolvedValue<GithubIssueReference>({
        number: 7,
        title: ISSUE.title,
        state: 'closed',
        body: ISSUE.body,
        labels: ISSUE.labels,
        htmlUrl: 'https://example.com/7'
      }),
      updateIssue: vi.fn().mockResolvedValue(undefined)
    };

    const result = await syncBacklog({ issues: [ISSUE], github });
    expect(github.updateIssue).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(1);
  });
});
