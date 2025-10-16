import type { GithubGateway, GithubIssueReference } from './types.js';

interface GithubClientOptions {
  readonly repository: string;
  readonly token?: string;
  readonly fetchImpl?: typeof fetch;
  readonly defaultLabelColor?: string;
}

interface GithubLabel {
  readonly name: string;
  readonly color?: string;
}

interface GithubIssueResponse {
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly body?: string | null;
  readonly html_url: string;
  readonly labels?: Array<GithubLabel | string>;
}

interface GithubSearchResponse {
  readonly items?: GithubIssueResponse[];
}

export class GithubClient implements GithubGateway {
  private readonly owner: string;
  private readonly repo: string;
  private readonly token?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultLabelColor: string;
  private knownLabels: Set<string> | null = null;

  constructor(options: GithubClientOptions) {
    const [owner, repo] = options.repository.split('/');
    if (!owner || !repo) {
      throw new Error('repository must be in the format <owner>/<repo>');
    }

    this.owner = owner;
    this.repo = repo;
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultLabelColor = options.defaultLabelColor ?? '6f42c1';
  }

  async findIssueByCode(code: string): Promise<GithubIssueReference | null> {
    const issue = await this.searchIssue(code);
    if (!issue) {
      return null;
    }

    const labels = (issue.labels ?? []).map((label) =>
      typeof label === 'string' ? label : label.name
    );

    return {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      body: issue.body ?? '',
      labels,
      htmlUrl: issue.html_url,
    };
  }

  async ensureLabels(labels: readonly string[]): Promise<void> {
    const existing = await this.loadKnownLabels();
    const missing = labels.filter((label) => !existing.has(label));
    if (missing.length === 0) {
      return;
    }

    for (const label of missing) {
      await this.createLabel(label);
      existing.add(label);
    }
  }

  async updateIssue(
    issueNumber: number,
    update: Partial<Pick<GithubIssueReference, 'body' | 'labels' | 'title'>>
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (typeof update.body === 'string') {
      payload.body = update.body;
    }

    if (Array.isArray(update.labels)) {
      payload.labels = update.labels;
    }

    if (typeof update.title === 'string') {
      payload.title = update.title;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    const response = await this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update issue #${issueNumber}: ${response.status} ${await response.text()}`
      );
    }
  }

  private async searchIssue(code: string): Promise<GithubIssueResponse | null> {
    const query = encodeURIComponent(`repo:${this.owner}/${this.repo} is:issue in:title "${code}"`);
    const response = await this.request(`/search/issues?q=${query}&per_page=5`);
    if (!response.ok) {
      throw new Error(`Failed to search issues: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as GithubSearchResponse;
    const items = data.items ?? [];
    const pattern = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'i');
    const match = items.find((item) => pattern.test(item.title));

    if (!match) {
      return null;
    }

    const issueResponse = await this.request(
      `/repos/${this.owner}/${this.repo}/issues/${match.number}`
    );

    if (!issueResponse.ok) {
      throw new Error(
        `Failed to load issue #${match.number}: ${issueResponse.status} ${await issueResponse.text()}`
      );
    }

    return (await issueResponse.json()) as GithubIssueResponse;
  }

  private async loadKnownLabels(): Promise<Set<string>> {
    if (this.knownLabels) {
      return this.knownLabels;
    }

    const labels = new Set<string>();
    let page = 1;
    while (true) {
      const response = await this.request(
        `/repos/${this.owner}/${this.repo}/labels?per_page=100&page=${page}`
      );

      if (!response.ok) {
        throw new Error(`Failed to list labels: ${response.status} ${await response.text()}`);
      }

      const data = (await response.json()) as GithubLabel[];
      if (data.length === 0) {
        break;
      }

      for (const label of data) {
        if (label.name) {
          labels.add(label.name);
        }
      }

      page += 1;
    }

    this.knownLabels = labels;
    return labels;
  }

  private async createLabel(name: string): Promise<void> {
    const payload = {
      name,
      color: this.defaultLabelColor,
    };

    const response = await this.request(`/repos/${this.owner}/${this.repo}/labels`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status !== 422) {
      throw new Error(
        `Failed to create label ${name}: ${response.status} ${await response.text()}`
      );
    }
  }

  private async request(pathname: string, init?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'influencerai-backlog-tools',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await this.fetchImpl(`https://api.github.com${pathname}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers ?? {}),
      },
    });

    return response;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
