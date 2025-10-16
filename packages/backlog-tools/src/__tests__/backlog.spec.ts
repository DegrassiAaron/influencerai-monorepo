import { describe, expect, it } from 'vitest';
import { isDodComplete, parseBacklog } from '../backlog.js';

const SAMPLE_YAML = `
issues:
  - code: TEST-01
    title: 'TEST-01: Example'
    body: |-
      ### DoD
      - [x] done
      - [x] also done
    labels: ['priority:P1']
  - title: 'TEST-02: Missing code derives from title'
    body: |-
      ### DoD
      - [ ] pending
`;

describe('parseBacklog', () => {
  it('normalises backlog issues and detects DoD completion', () => {
    const issues = parseBacklog(SAMPLE_YAML);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        code: 'TEST-01',
        title: 'TEST-01: Example',
        dodComplete: true,
        labels: ['priority:P1'],
      })
    );
    expect(issues[1]).toEqual(
      expect.objectContaining({
        code: 'TEST-02',
        dodComplete: false,
      })
    );
  });
});

describe('isDodComplete', () => {
  it('returns true when all checkboxes are checked', () => {
    const body = '- [x] done\n- [X] done again';
    expect(isDodComplete(body)).toBe(true);
  });

  it('returns false when there are unchecked items', () => {
    const body = '- [x] done\n- [ ] pending';
    expect(isDodComplete(body)).toBe(false);
  });

  it('returns false when no checkboxes are present', () => {
    expect(isDodComplete('No tasks')).toBe(false);
  });
});
