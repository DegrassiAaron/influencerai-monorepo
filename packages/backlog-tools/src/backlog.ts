import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { BacklogIssue } from './types.js';

interface RawBacklogIssue {
  readonly code?: unknown;
  readonly title?: unknown;
  readonly body?: unknown;
  readonly labels?: unknown;
  readonly assignees?: unknown;
  readonly milestone?: unknown;
}

interface RawBacklogFile {
  readonly issues?: unknown;
}

const CHECKBOX_PATTERN = /-\s*\[(?<status>[ xX])\]/g;

export function isDodComplete(body: string): boolean {
  const matches = Array.from(body.matchAll(CHECKBOX_PATTERN));
  if (matches.length === 0) {
    return false;
  }

  return matches.every((match) => {
    const status = match.groups?.status ?? '';
    return status.toLowerCase() === 'x';
  });
}

function normaliseBody(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Backlog issue body must be a string');
  }

  return value.replace(/\r\n/g, '\n');
}

function normaliseTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Backlog issue title must be a non-empty string');
  }

  return value.trim();
}

function deriveCode(issue: RawBacklogIssue): string {
  if (typeof issue.code === 'string' && issue.code.trim() !== '') {
    return issue.code.trim();
  }

  if (typeof issue.title === 'string') {
    const code = issue.title.split(':', 1)[0]?.trim();
    if (code) {
      return code;
    }
  }

  throw new Error('Backlog issue is missing a code');
}

function normaliseLabels(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Backlog issue labels must be an array');
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim());
}

function normaliseAssignees(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Backlog issue assignees must be an array');
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim());
}

function normaliseMilestone(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Backlog issue milestone must be a non-empty string if provided');
  }

  return value.trim();
}

export async function loadBacklogIssues(backlogPath: string): Promise<BacklogIssue[]> {
  const content = await readFile(backlogPath, 'utf8');
  return parseBacklog(content);
}

export function parseBacklog(yamlContent: string): BacklogIssue[] {
  const document = parse(yamlContent) as RawBacklogFile;
  const { issues } = document;

  if (!Array.isArray(issues)) {
    throw new Error("Backlog file must contain an 'issues' array");
  }

  return issues.map((rawIssue, index) => normaliseIssue(rawIssue, index));
}

function normaliseIssue(rawIssue: unknown, index: number): BacklogIssue {
  if (rawIssue == null || typeof rawIssue !== 'object') {
    throw new Error(`Issue at index ${index} must be an object`);
  }

  const candidate = rawIssue as RawBacklogIssue;
  const title = normaliseTitle(candidate.title);
  const body = normaliseBody(candidate.body);
  const issue: BacklogIssue = {
    code: deriveCode(candidate),
    title,
    body,
    labels: normaliseLabels(candidate.labels),
    assignees: normaliseAssignees(candidate.assignees),
    milestone: normaliseMilestone(candidate.milestone),
    dodComplete: isDodComplete(body)
  };

  return issue;
}
