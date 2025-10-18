# MCP Servers Docker Setup

This directory contains Docker configuration for all Model Context Protocol (MCP) servers used in the InfluencerAI monorepo.

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
# Edit .env with your actual API keys and tokens
```

### 2. Start All MCP Servers

```bash
cd docker/mcp
docker-compose up -d
```

### 3. Verify Status

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs -f github
```

### 4. Stop Services

```bash
docker-compose down

# Stop and remove volumes (WARNING: deletes persistent data)
docker-compose down -v
```

## Available MCP Servers

| Server | Container Name | Port | Health Check |
|--------|---------------|------|--------------|
| GitHub Project Manager | mcp-github | - | Yes |
| n8n Workflow Manager | mcp-n8n | - | Yes |
| Memory Bank | mcp-memory | - | Yes |
| Sequential Thinking | mcp-sequential | - | No |
| Playwright | mcp-playwright | - | No |
| Magic UI | mcp-magic | - | No |
| Context7 | mcp-context7 | - | No |
| Knowledge Graph | mcp-knowledge-graph | - | No |
| Qdrant (optional) | mcp-qdrant | 6333, 6334 | No |

## Configuration

### Required Environment Variables

#### GitHub
- `GITHUB_TOKEN`: Personal access token with repo permissions
- `GITHUB_OWNER`: Your GitHub username or organization
- `GITHUB_REPO`: Repository name

#### n8n
- `N8N_API_URL`: n8n instance URL (default: http://localhost:5678)
- `N8N_API_KEY`: n8n API key

#### OpenRouter (used by sequential and magic)
- `OPENROUTER_API_KEY`: OpenRouter API key

#### Magic
- `MAGIC_API_KEY`: 21st.dev Magic API key

#### Context7
- `CONTEXT7_API_KEY`: Upstash Context7 API key

#### Knowledge Graph
- `KG_QDRANT_URL`: Qdrant URL (default: http://qdrant:6333)
- `KG_COLLECTION`: Collection name (default: knowledge_graph)

### Security Features

All containers are configured with:
- Read-only filesystem
- All Linux capabilities dropped
- No privilege escalation
- Process limits (128-256)
- Memory limits (512MB-1GB)
- CPU limits (0.5-1.0 cores)
- Non-root user (UID 1000)
- Tmpfs mounts for /tmp

### Persistent Volumes

- `mcp-memory`: Memory Bank data storage
- `mcp-knowledge`: Knowledge Graph data storage
- `qdrant-data`: Qdrant vector database storage

## Troubleshooting

### Images Not Found

If you get "image not found" errors, the images may need to be built locally. Check the main `mcp/README.md` for build instructions or contact the maintainer.

### Permission Errors

Ensure your user ID matches the container user (1000:1000):

```bash
id -u  # Should be 1000
id -g  # Should be 1000
```

If different, update the `user` field in docker-compose.yml.

### Memory Issues

If containers are OOM (Out of Memory), increase limits in docker-compose.yml:

```yaml
mem_limit: 1024m
```

### Container Won't Start

Check logs for specific errors:

```bash
docker-compose logs [service-name]
```

Common issues:
- Missing environment variables
- Port conflicts
- Volume permission issues

## Integration with Claude Desktop

To use these MCP servers with Claude Desktop, add them to your configuration:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Example configuration is provided in the main `mcp/README.md`.

## Maintenance

### Update Images

```bash
docker-compose pull
docker-compose up -d
```

### Backup Volumes

```bash
# Backup memory bank
docker run --rm -v mcp-memory:/data -v $(pwd):/backup alpine tar czf /backup/memory-backup.tar.gz /data

# Backup knowledge graph
docker run --rm -v mcp-knowledge:/data -v $(pwd):/backup alpine tar czf /backup/knowledge-backup.tar.gz /data
```

### Restore Volumes

```bash
# Restore memory bank
docker run --rm -v mcp-memory:/data -v $(pwd):/backup alpine tar xzf /backup/memory-backup.tar.gz

# Restore knowledge graph
docker run --rm -v mcp-knowledge:/data -v $(pwd):/backup alpine tar xzf /backup/knowledge-backup.tar.gz
```

### View Resource Usage

```bash
# All containers
docker stats

# Specific containers
docker stats mcp-github mcp-memory mcp-knowledge-graph
```

## Support

For issues or questions:
- Check main `mcp/README.md` for detailed documentation
- Review logs: `docker-compose logs -f`
- Check container health: `docker-compose ps`
