#!/usr/bin/env node

/**
 * n8n Workflow Import Script
 *
 * This script imports workflow JSON files into n8n using the REST API.
 *
 * Usage:
 *   node import-workflows.js [workflow-file.json]
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
 * Import a single workflow
 * @param {string} filePath - Path to workflow JSON file
 * @returns {Promise<object>} Import result
 */
async function importWorkflow(filePath) {
  const fileName = path.basename(filePath);

  console.log(`\nImporting: ${fileName}`);

  // Read workflow file
  let workflowData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    workflowData = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(`Failed to read workflow file: ${err.message}`);
  }

  // Validate required fields
  if (!workflowData.name) {
    throw new Error('Workflow must have a name');
  }

  // Check if workflow with same name already exists
  try {
    const existingWorkflows = await makeRequest('GET', '/api/v1/workflows');
    const existing = existingWorkflows.data?.find(w => w.name === workflowData.name);

    if (existing) {
      console.log(`  ⚠ Workflow "${workflowData.name}" already exists (ID: ${existing.id})`);
      console.log(`  Updating existing workflow...`);

      // Update existing workflow
      const updated = await makeRequest('PATCH', `/api/v1/workflows/${existing.id}`, {
        ...workflowData,
        id: existing.id,
      });

      console.log(`  ✓ Updated workflow "${workflowData.name}" (ID: ${updated.id})`);
      return { action: 'updated', workflow: updated };
    }
  } catch (err) {
    console.log(`  ⚠ Could not check existing workflows: ${err.message}`);
    console.log(`  Attempting to create new workflow...`);
  }

  // Create new workflow
  try {
    const created = await makeRequest('POST', '/api/v1/workflows', workflowData);
    console.log(`  ✓ Created workflow "${workflowData.name}" (ID: ${created.id})`);
    return { action: 'created', workflow: created };
  } catch (err) {
    throw new Error(`Failed to create workflow: ${err.message}`);
  }
}

/**
 * Import all workflows from directory
 * @param {string} directory - Directory containing workflow files
 * @returns {Promise<object>} Import summary
 */
async function importAllWorkflows(directory) {
  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.json') && !f.includes('.template.'))
    .map(f => path.join(directory, f));

  if (files.length === 0) {
    console.log('No workflow files found in:', directory);
    return { created: 0, updated: 0, failed: 0 };
  }

  console.log(`Found ${files.length} workflow file(s) to import\n`);

  const results = {
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const file of files) {
    try {
      const result = await importWorkflow(file);
      if (result.action === 'created') {
        results.created++;
      } else if (result.action === 'updated') {
        results.updated++;
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      results.failed++;
      results.errors.push({ file: path.basename(file), error: err.message });
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
  console.log('  n8n Workflow Import Script');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate environment
  const isValid = await validateEnvironment();
  if (!isValid) {
    process.exit(1);
  }

  // Determine what to import
  const args = process.argv.slice(2);
  let results;

  if (args.length > 0) {
    // Import specific file(s)
    results = { created: 0, updated: 0, failed: 0, errors: [] };

    for (const arg of args) {
      const filePath = path.resolve(arg);

      if (!fs.existsSync(filePath)) {
        console.log(`\n✗ File not found: ${filePath}`);
        results.failed++;
        results.errors.push({ file: arg, error: 'File not found' });
        continue;
      }

      try {
        const result = await importWorkflow(filePath);
        if (result.action === 'created') {
          results.created++;
        } else if (result.action === 'updated') {
          results.updated++;
        }
      } catch (err) {
        console.log(`  ✗ Error: ${err.message}`);
        results.failed++;
        results.errors.push({ file: path.basename(filePath), error: err.message });
      }
    }
  } else {
    // Import all workflows from directory
    results = await importAllWorkflows(WORKFLOWS_DIR);
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Import Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Created: ${results.created}`);
  console.log(`  Updated: ${results.updated}`);
  console.log(`  Failed:  ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    results.errors.forEach(({ file, error }) => {
      console.log(`    - ${file}: ${error}`);
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
