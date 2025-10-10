#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Initialize n8n API client
const n8nClient = axios.create({
  baseURL: process.env.N8N_API_URL || 'http://n8n:5678/api/v1',
  timeout: parseInt(process.env.N8N_API_TIMEOUT) || 30000,
  headers: {
    'X-N8N-API-KEY': process.env.N8N_API_KEY,
    'Content-Type': 'application/json',
  },
});

// Create MCP server
const server = new Server(
  {
    name: 'n8n-workflow-manager',
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
    name: 'n8n_list_workflows',
    description: 'List all n8n workflows',
    inputSchema: {
      type: 'object',
      properties: {
        active: { type: 'boolean', description: 'Filter by active status' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        limit: { type: 'number', description: 'Maximum number of results', default: 50 },
      },
    },
  },
  {
    name: 'n8n_get_workflow',
    description: 'Get details of a specific workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'n8n_create_workflow',
    description: 'Create a new workflow',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        nodes: { type: 'array', description: 'Array of workflow nodes' },
        connections: { type: 'object', description: 'Node connections' },
        active: { type: 'boolean', description: 'Activate immediately', default: false },
        tags: { type: 'array', items: { type: 'string' }, description: 'Workflow tags' },
      },
      required: ['name', 'nodes'],
    },
  },
  {
    name: 'n8n_update_workflow',
    description: 'Update an existing workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID' },
        name: { type: 'string', description: 'New workflow name' },
        nodes: { type: 'array', description: 'Updated nodes' },
        connections: { type: 'object', description: 'Updated connections' },
        active: { type: 'boolean', description: 'Set active status' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'n8n_delete_workflow',
    description: 'Delete a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID' },
        confirm: { type: 'boolean', description: 'Confirm deletion' },
      },
      required: ['workflow_id', 'confirm'],
    },
  },
  {
    name: 'n8n_execute_workflow',
    description: 'Execute a workflow manually',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID' },
        data: { type: 'object', description: 'Input data for execution' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'n8n_list_executions',
    description: 'List workflow executions',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Filter by workflow ID' },
        status: {
          type: 'string',
          enum: ['success', 'error', 'running', 'waiting'],
          description: 'Filter by execution status',
        },
        limit: { type: 'number', description: 'Maximum results', default: 20 },
      },
    },
  },
  {
    name: 'n8n_get_execution',
    description: 'Get details of a specific execution',
    inputSchema: {
      type: 'object',
      properties: {
        execution_id: { type: 'string', description: 'Execution ID' },
      },
      required: ['execution_id'],
    },
  },
  {
    name: 'n8n_export_workflow',
    description: 'Export workflow as JSON',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'Workflow ID' },
        include_credentials: {
          type: 'boolean',
          description: 'Include credentials (use with caution)',
          default: false,
        },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'n8n_import_workflow',
    description: 'Import workflow from JSON',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_json: { type: 'object', description: 'Workflow JSON data' },
        activate: { type: 'boolean', description: 'Activate after import', default: false },
      },
      required: ['workflow_json'],
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

  try {
    switch (name) {
      case 'n8n_list_workflows': {
        const params = {};
        if (args.active !== undefined) params.active = args.active;
        if (args.tags) params.tags = args.tags.join(',');

        const response = await n8nClient.get('/workflows', { params });
        const workflows = response.data.data.slice(0, args.limit || 50);
        const summary = workflows.map(
          (w) => `${w.id}: ${w.name} (${w.active ? 'active' : 'inactive'})`
        );
        return {
          content: [
            {
              type: 'text',
              text: `Found ${workflows.length} workflows:\n${summary.join('\n')}`,
            },
          ],
        };
      }

      case 'n8n_get_workflow': {
        const response = await n8nClient.get(`/workflows/${args.workflow_id}`);
        const workflow = response.data.data;
        return {
          content: [
            {
              type: 'text',
              text: `Workflow: ${workflow.name}\nID: ${workflow.id}\nActive: ${workflow.active}\nNodes: ${workflow.nodes.length}\nTags: ${workflow.tags?.join(', ') || 'none'}`,
            },
          ],
        };
      }

      case 'n8n_create_workflow': {
        const workflowData = {
          name: args.name,
          nodes: args.nodes,
          connections: args.connections || {},
          active: args.active || false,
          tags: args.tags || [],
        };
        const response = await n8nClient.post('/workflows', workflowData);
        return {
          content: [
            {
              type: 'text',
              text: `Workflow created: ${response.data.data.name} (ID: ${response.data.data.id})`,
            },
          ],
        };
      }

      case 'n8n_update_workflow': {
        const updateData = {};
        if (args.name) updateData.name = args.name;
        if (args.nodes) updateData.nodes = args.nodes;
        if (args.connections) updateData.connections = args.connections;
        if (args.active !== undefined) updateData.active = args.active;

        const response = await n8nClient.patch(`/workflows/${args.workflow_id}`, updateData);
        return {
          content: [
            {
              type: 'text',
              text: `Workflow updated: ${response.data.data.name}`,
            },
          ],
        };
      }

      case 'n8n_delete_workflow': {
        if (!args.confirm) {
          return {
            content: [
              {
                type: 'text',
                text: 'Deletion not confirmed. Set confirm=true to delete.',
              },
            ],
          };
        }
        await n8nClient.delete(`/workflows/${args.workflow_id}`);
        return {
          content: [
            {
              type: 'text',
              text: `Workflow ${args.workflow_id} deleted successfully.`,
            },
          ],
        };
      }

      case 'n8n_execute_workflow': {
        const response = await n8nClient.post(`/workflows/${args.workflow_id}/execute`, {
          data: args.data || {},
        });
        return {
          content: [
            {
              type: 'text',
              text: `Workflow executed. Execution ID: ${response.data.data.id}`,
            },
          ],
        };
      }

      case 'n8n_list_executions': {
        const params = {};
        if (args.workflow_id) params.workflowId = args.workflow_id;
        if (args.status) params.status = args.status;
        params.limit = args.limit || 20;

        const response = await n8nClient.get('/executions', { params });
        const executions = response.data.data;
        const summary = executions.map(
          (e) =>
            `${e.id}: ${e.workflowData?.name || 'Unknown'} - ${e.finished ? 'Finished' : 'Running'} (${e.status})`
        );
        return {
          content: [
            {
              type: 'text',
              text: `Found ${executions.length} executions:\n${summary.join('\n')}`,
            },
          ],
        };
      }

      case 'n8n_get_execution': {
        const response = await n8nClient.get(`/executions/${args.execution_id}`);
        const execution = response.data.data;
        return {
          content: [
            {
              type: 'text',
              text: `Execution ${execution.id}\nWorkflow: ${execution.workflowData?.name}\nStatus: ${execution.status}\nStarted: ${execution.startedAt}\nFinished: ${execution.stoppedAt || 'Running'}`,
            },
          ],
        };
      }

      case 'n8n_export_workflow': {
        const response = await n8nClient.get(`/workflows/${args.workflow_id}`);
        const workflow = response.data.data;

        if (!args.include_credentials) {
          // Remove credentials from export
          workflow.nodes = workflow.nodes.map((node) => {
            const cleaned = { ...node };
            delete cleaned.credentials;
            return cleaned;
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workflow, null, 2),
            },
          ],
        };
      }

      case 'n8n_import_workflow': {
        const workflowData = {
          ...args.workflow_json,
          active: args.activate || false,
        };
        const response = await n8nClient.post('/workflows', workflowData);
        return {
          content: [
            {
              type: 'text',
              text: `Workflow imported: ${response.data.data.name} (ID: ${response.data.data.id})`,
            },
          ],
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
          text: `Error: ${error.response?.data?.message || error.message}`,
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
  console.error('n8n Workflow Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
