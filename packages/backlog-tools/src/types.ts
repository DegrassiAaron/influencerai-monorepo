export interface BacklogIssue {
  readonly code: string;
  readonly title: string;
  readonly body: string;
  readonly labels: readonly string[];
  readonly assignees: readonly string[];
  readonly milestone?: string;
  readonly dodComplete: boolean;
}

export interface GithubIssueReference {
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly body: string;
  readonly labels: readonly string[];
  readonly htmlUrl: string;
}

export interface GithubGateway {
  findIssueByCode(code: string): Promise<GithubIssueReference | null>;
  ensureLabels(labels: readonly string[]): Promise<void>;
  updateIssue(
    issueNumber: number,
    update: Partial<Pick<GithubIssueReference, 'body' | 'labels' | 'title'>>
  ): Promise<void>;
}

export interface VerificationMismatch {
  readonly code: string;
  readonly title: string;
  readonly reason: string;
  readonly issueUrl?: string;
}

export interface VerificationResult {
  readonly checked: number;
  readonly mismatches: readonly VerificationMismatch[];
}

export interface SyncResult {
  readonly updated: number;
  readonly unchanged: number;
  readonly missing: readonly BacklogIssue[];
}
