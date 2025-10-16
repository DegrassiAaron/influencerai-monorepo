#!/usr/bin/env node

/**
 * n8n Workflow Export Script
 *
 * This script exports workflows from n8n using the REST API.
 *
 * Usage:
 *   node export-workflows.js [workflow-id]
 *   node export-workflows.js --all
 *
 * Environment Variables:
 *   N8N_BASE_URL - Base URL for n8n (default: http://localhost:5678)
 *   N8N_API_KEY - API key for authentication (optional for local dev)
 *   N8N_USER - Username for basic auth (optional)
 *   N8N_PASSWORD - Password for basic auth (optional)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_USER = process.env.N8N_USER || '';
const N8N_PASSWORD = process.env.N8N_PASSWORD || '';

// Workflow directory
const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');

/**
 * Make HTTP request to n8n API
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint path
 * @param {object|null} data - Request body
 * @returns {Promise<object>} Response data
 */
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, N8N_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add authentication
    if (N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = N8N_API_KEY;
    } else if (N8N_USER && N8N_PASSWORD) {
      const auth = Buffer.from(`${N8N_USER}:${N8N_PASSWORD}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const options = {
      method,
      headers,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
    };

    const req = httpModule.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || body}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Generate filename from workflow name
 * @param {string} name - Workflow name
 * @returns {string} Safe filename
 */
function generateFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '.json';
}

/**
 * Clean workflow data for export
 * @param {object} workflow - Workflow data
 * @returns {object} Cleaned workflow data
 */
function cleanWorkflowData(workflow) {
  // Remove server-generated fields
  const cleaned = { ...workflow };
  delete cleaned.id;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;

  // Ensure consistent structure
  return {
    name: cleaned.name,
    active: cleaned.active || false,
    nodes: cleaned.nodes || [],
    connections: cleaned.connections || {},
    settings: cleaned.settings || {},
    staticData: cleaned.staticData || null,
    tags: cleaned.tags || [],
    pinData: cleaned.pinData || {},
    versionId: '1',
  };
}

/**
 * Export a single workflow
 * @param {string} workflowId - Workflow ID
 * @param {string|null} outputPath - Custom output path
 * @returns {Promise<object>} Export result
 */
async function exportWorkflow(workflowId, outputPath = null) {
  console.log(`\nExporting workflow: ${workflowId}`);

  // Fetch workflow
  let workflow;
  try {
    workflow = await makeRequest('GET', `/api/v1/workflows/${workflowId}`);
  } catch (err) {
    throw new Error(`Failed to fetch workflow: ${err.message}`);
  }

  // Clean workflow data
  const cleanedWorkflow = cleanWorkflowData(workflow);

  // Determine output path
  const fileName = outputPath || generateFilename(workflow.name);
  const filePath = path.isAbsolute(fileName)
    ? fileName
    : path.join(WORKFLOWS_DIR, fileName);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write workflow file
  try {
    fs.writeFileSync(filePath, JSON.stringify(cleanedWorkflow, null, 2), 'utf8');
    console.log(`  ✓ Exported "${workflow.name}" to ${path.relative(process.cwd(), filePath)}`);
    return { success: true, workflow: workflow.name, file: filePath };
  } catch (err) {
    throw new Error(`Failed to write workflow file: ${err.message}`);
  }
}

/**
 * Export all workflows
 * @returns {Promise<object>} Export summary
 */
async function exportAllWorkflows() {
  console.log('Fetching all workflows...\n');

  // Fetch all workflows
  let workflows;
  try {
    const response = await makeRequest('GET', '/api/v1/workflows');
    workflows = response.data || [];
  } catch (err) {
    throw new Error(`Failed to fetch workflows: ${err.message}`);
  }

  if (workflows.length === 0) {
    console.log('No workflows found in n8n');
    return { exported: 0, failed: 0 };
  }

  console.log(`Found ${workflows.length} workflow(s)\n`);

  const results = {
    exported: 0,
    failed: 0,
    errors: [],
  };

  // Export each workflow
  for (const workflow of workflows) {
    try {
      await exportWorkflow(workflow.id);
      results.exported++;
    } catch (err) {
      console.log(`  ✗ Error exporting "${workflow.name}": ${err.message}`);
      results.failed++;
      results.errors.push({ workflow: workflow.name, error: err.message });
    }
  }

  return results;
}

/**
 * Validate environment and connection
 * @returns {Promise<boolean>} True if validation passes
 */
async function validateEnvironment() {
  console.log('Validating environment...');
  console.log(`  n8n URL: ${N8N_BASE_URL}`);
  console.log(`  API Key: ${N8N_API_KEY ? '***' + N8N_API_KEY.slice(-4) : 'not set'}`);
  console.log(`  Basic Auth: ${N8N_USER ? 'configured' : 'not set'}`);

  // Test connection
  try {
    console.log('\nTesting connection to n8n...');
    await makeRequest('GET', '/healthz');
    console.log('  ✓ Connection successful\n');
    return true;
  } catch (err) {
    console.error(`  ✗ Connection failed: ${err.message}`);
    console.error('\nPlease ensure:');
    console.error('  1. n8n is running');
    console.error('  2. N8N_BASE_URL is correct');
    console.error('  3. Authentication credentials are valid (if required)');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  n8n Workflow Export Script');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate environment
  const isValid = await validateEnvironment();
  if (!isValid) {
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  let results;

  if (args.length === 0 || args.includes('--all')) {
    // Export all workflows
    results = await exportAllWorkflows();
  } else {
    // Export specific workflow(s)
    results = { exported: 0, failed: 0, errors: [] };

    for (const workflowId of args) {
      try {
        await exportWorkflow(workflowId);
        results.exported++;
      } catch (err) {
        console.log(`  ✗ Error: ${err.message}`);
        results.failed++;
        results.errors.push({ workflow: workflowId, error: err.message });
      }
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Export Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Exported: ${results.exported}`);
  console.log(`  Failed:   ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    results.errors.forEach(({ workflow, error }) => {
      console.log(`    - ${workflow}: ${error}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run main function
main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
