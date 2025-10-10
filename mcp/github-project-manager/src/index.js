#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
});

const DEFAULT_OWNER = process.env.GITHUB_OWNER;
const DEFAULT_REPO = process.env.GITHUB_REPO;

// Create MCP server
const server = new Server(
  {
    name: 'github-project-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS = [
  {
    name: 'github_create_issue',
    description: 'Create a new issue in the GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue description' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply' },
        assignees: { type: 'array', items: { type: 'string' }, description: 'Users to assign' },
        milestone: { type: 'number', description: 'Milestone number' },
        owner: { type: 'string', description: 'Repository owner (optional)' },
        repo: { type: 'string', description: 'Repository name (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'github_list_issues',
    description: 'List issues in the GitHub repository',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Issue state' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Filter by labels' },
        assignee: { type: 'string', description: 'Filter by assignee' },
        limit: { type: 'number', description: 'Maximum number of issues to return', default: 30 },
        owner: { type: 'string', description: 'Repository owner (optional)' },
        repo: { type: 'string', description: 'Repository name (optional)' },
      },
    },
  },
  {
    name: 'github_create_pr',
    description: 'Create a new pull request',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'PR title' },
        body: { type: 'string', description: 'PR description' },
        head: { type: 'string', description: 'Branch to merge from' },
        base: { type: 'string', description: 'Branch to merge into', default: 'main' },
        draft: { type: 'boolean', description: 'Create as draft PR', default: false },
        owner: { type: 'string', description: 'Repository owner (optional)' },
        repo: { type: 'string', description: 'Repository name (optional)' },
      },
      required: ['title', 'head'],
    },
  },
  {
    name: 'github_review_pr',
    description: 'Review a pull request',
    inputSchema: {
      type: 'object',
      properties: {
        pr_number: { type: 'number', description: 'Pull request number' },
        event: {
          type: 'string',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'],
          description: 'Review event type',
        },
        body: { type: 'string', description: 'Review comment' },
        comments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              line: { type: 'number' },
              body: { type: 'string' },
            },
          },
          description: 'Inline comments',
        },
        owner: { type: 'string', description: 'Repository owner (optional)' },
        repo: { type: 'string', description: 'Repository name (optional)' },
      },
      required: ['pr_number', 'event'],
    },
  },
  {
    name: 'github_search_code',
    description: 'Search code in the repository',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        path: { type: 'string', description: 'File path pattern' },
        language: { type: 'string', description: 'Programming language' },
        owner: { type: 'string', description: 'Repository owner (optional)' },
        repo: { type: 'string', description: 'Repository name (optional)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'github_get_stats',
    description: 'Get repository statistics',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['issues', 'prs', 'contributors', 'commits'],
          description: 'Type of statistics',
        },
        period: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: 'Time period',
          default: 'week',
        },
        owner: { type: 'string', description: 'Repository owner (optional)' },
        repo: { type: 'string', description: 'Repository name (optional)' },
      },
      required: ['type'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const owner = args.owner || DEFAULT_OWNER;
  const repo = args.repo || DEFAULT_REPO;

  if (!owner || !repo) {
    throw new Error('Repository owner and name must be specified either as arguments or environment variables');
  }

  try {
    switch (name) {
      case 'github_create_issue': {
        const issue = await octokit.issues.create({
          owner,
          repo,
          title: args.title,
          body: args.body,
          labels: args.labels,
          assignees: args.assignees,
          milestone: args.milestone,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Issue created: #${issue.data.number}\nURL: ${issue.data.html_url}`,
            },
          ],
        };
      }

      case 'github_list_issues': {
        const issues = await octokit.issues.listForRepo({
          owner,
          repo,
          state: args.state || 'open',
          labels: args.labels?.join(','),
          assignee: args.assignee,
          per_page: args.limit || 30,
        });
        const issueList = issues.data.map(
          (issue) => `#${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
        );
        return {
          content: [
            {
              type: 'text',
              text: `Found ${issues.data.length} issues:\n${issueList.join('\n')}`,
            },
          ],
        };
      }

      case 'github_create_pr': {
        const pr = await octokit.pulls.create({
          owner,
          repo,
          title: args.title,
          body: args.body,
          head: args.head,
          base: args.base || 'main',
          draft: args.draft || false,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Pull request created: #${pr.data.number}\nURL: ${pr.data.html_url}`,
            },
          ],
        };
      }

      case 'github_review_pr': {
        const review = await octokit.pulls.createReview({
          owner,
          repo,
          pull_number: args.pr_number,
          event: args.event,
          body: args.body,
          comments: args.comments,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Review submitted for PR #${args.pr_number}: ${args.event}`,
            },
          ],
        };
      }

      case 'github_search_code': {
        let searchQuery = `${args.query} repo:${owner}/${repo}`;
        if (args.path) searchQuery += ` path:${args.path}`;
        if (args.language) searchQuery += ` language:${args.language}`;

        const results = await octokit.search.code({
          q: searchQuery,
        });
        const resultList = results.data.items.map((item) => `${item.path}: ${item.html_url}`);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.data.total_count} results:\n${resultList.join('\n')}`,
            },
          ],
        };
      }

      case 'github_get_stats': {
        // Simplified stats implementation
        const now = new Date();
        const since = new Date(now);
        switch (args.period) {
          case 'day':
            since.setDate(since.getDate() - 1);
            break;
          case 'week':
            since.setDate(since.getDate() - 7);
            break;
          case 'month':
            since.setMonth(since.getMonth() - 1);
            break;
          case 'year':
            since.setFullYear(since.getFullYear() - 1);
            break;
        }

        let stats = '';
        if (args.type === 'issues' || args.type === 'prs') {
          const items = await octokit.issues.listForRepo({
            owner,
            repo,
            since: since.toISOString(),
            state: 'all',
            per_page: 100,
          });
          const filtered = args.type === 'prs' ? items.data.filter((i) => i.pull_request) : items.data.filter((i) => !i.pull_request);
          stats = `${args.type}: ${filtered.length} in the last ${args.period}`;
        } else if (args.type === 'commits') {
          const commits = await octokit.repos.listCommits({
            owner,
            repo,
            since: since.toISOString(),
            per_page: 100,
          });
          stats = `commits: ${commits.data.length} in the last ${args.period}`;
        } else if (args.type === 'contributors') {
          const contributors = await octokit.repos.listContributors({
            owner,
            repo,
          });
          stats = `contributors: ${contributors.data.length} total`;
        }

        return {
          content: [{ type: 'text', text: stats }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GitHub Project Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
