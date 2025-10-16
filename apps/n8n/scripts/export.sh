#!/bin/bash

# n8n Workflow Export Script Wrapper
# This script provides a convenient interface for exporting workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Load environment variables if .env file exists
ENV_FILE="${SCRIPT_DIR}/../../../.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}Loading environment from .env${NC}"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Set default values
export N8N_BASE_URL="${N8N_BASE_URL:-http://localhost:5678}"

# Print usage
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [workflow-id] | --all"
    echo ""
    echo "Export workflow(s) from n8n"
    echo ""
    echo "Options:"
    echo "  [id]         Export specific workflow by ID"
    echo "  --all        Export all workflows"
    echo "  --help, -h   Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  N8N_BASE_URL  - n8n server URL (default: http://localhost:5678)"
    echo "  N8N_API_KEY   - API key for authentication"
    echo "  N8N_USER      - Username for basic auth"
    echo "  N8N_PASSWORD  - Password for basic auth"
    echo ""
    exit 0
fi

# Run the export script
echo -e "${GREEN}Starting workflow export...${NC}"
node "${SCRIPT_DIR}/export-workflows.js" "$@"
