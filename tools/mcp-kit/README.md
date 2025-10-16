# MCP Kit — Model Context Protocol Server Setup

This directory contains standardized MCP server configurations for the InfluencerAI monorepo, following a portable "as-code" approach that can be replicated across multiple repositories (MeepleAI, InfluencerAI, etc.).

## Quick Start

### 1. Set up your GitHub token

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and add your GitHub Personal Access Token
# Get one from: https://github.com/settings/tokens
# Required scopes: repo, read:org, read:user
```

**IMPORTANT:** Never commit `.env.local` - it's already in `.gitignore`

### 2. Verify your setup

In VSCode, run the task: **Tasks → Run Task → MCP: env-check**

You should see: `OK`

### 3. Start using MCP servers

Open Claude Code (Codex) and type `/mcp` to see available servers.

You should now see the `github` server listed.

## Architecture: Hybrid Approach

This repository uses **two complementary MCP approaches**:

### Approach 1: Simple STDIO Wrappers (NEW - MCP Kit)

**Location:** `tools/mcp-kit/wrappers/`
**Configuration:** `.codex/mcp.toml` → `[mcp_servers.github]`
**How it works:** PowerShell scripts that launch ephemeral Docker containers in STDIO mode

**When to use:**
- Quick start with minimal configuration
- Single MCP server needs (e.g., just GitHub)
- Maximum portability across repositories
- Development and experimentation

**Example servers:**
- `github` - Simple GitHub MCP wrapper

### Approach 2: Docker Compose (EXISTING - Production)

**Location:** `docker/mcp/`
**Configuration:** `.codex/mcp.toml` → `[mcp_servers."github-project-manager"]` etc.
**How it works:** Full Docker Compose setup with networking, volumes, health checks, resource limits

**When to use:**
- Production environments with multiple MCP servers
- Servers that need to communicate with each other
- Advanced features (persistent storage, health checks, resource limits)
- Complex multi-service scenarios (n8n, knowledge-graph, etc.)

**Example servers:**
- `github-project-manager` - Full-featured GitHub MCP with Docker Compose
- `memory-bank`, `sequential`, `playwright`, `magic`, `claude-context`, `knowledge-graph`, `n8n`

## Decision Matrix

| Criterion | Simple Wrapper | Docker Compose |
|-----------|---------------|----------------|
| **Setup complexity** | Low | Medium |
| **Container lifecycle** | Ephemeral (created/destroyed per use) | Can be persistent |
| **Resource usage** | Minimal (on-demand only) | Higher (multiple services) |
| **Portability** | Very high (copy wrapper to any repo) | Medium (requires compose setup) |
| **Security features** | Basic (STDIO only, no ports) | Advanced (networks, secrets, limits) |
| **Inter-service communication** | Not supported | Full Docker networking |
| **Best for** | Individual MCP servers | Multi-service orchestration |

**Rule of thumb:**
- If you need ONE MCP server → Use **Simple Wrapper**
- If you need MULTIPLE interconnected MCP servers → Use **Docker Compose**

## Directory Structure

```
tools/mcp-kit/
├─ wrappers/              # PowerShell wrapper scripts
│  └─ github-mcp.ps1      # GitHub MCP STDIO wrapper
├─ .env.example           # Template for local secrets
├─ .env.local            # Your actual secrets (git-ignored)
└─ README.md              # This file
```

## How STDIO Wrappers Work

1. **Codex calls the wrapper:** When you use `/mcp`, Codex executes the PowerShell script
2. **Wrapper reads secrets:** Script loads `GITHUB_PAT` from `.env.local` or environment
3. **Docker container starts:** `docker run -i --rm` creates ephemeral container
4. **STDIO communication:** Codex communicates with MCP server via stdin/stdout
5. **Container cleanup:** On exit, `--rm` automatically removes the container

**Security benefits:**
- No exposed ports
- Ephemeral containers (nothing persists)
- Secrets stay local (never committed)
- Isolated per-machine configuration

## Configuration Files

### `.codex/mcp.toml`

Defines which MCP servers are available to Codex:

```toml
# Simple wrapper approach (MCP Kit)
[mcp_servers.github]
command = "powershell"
args = [
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "${workspaceFolder}/tools/mcp-kit/wrappers/github-mcp.ps1"
]
```

### `.env.local` (you create this)

Your local secrets:

```env
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### `.vscode/tasks.json`

VSCode tasks for testing:

- **MCP: env-check** - Verifies `GITHUB_PAT` is set
- **MCP: smoke-test (GitHub)** - Lists available MCP servers

## Adding More MCP Servers

To add a new MCP server (e.g., Linear):

1. **Create wrapper script:** `tools/mcp-kit/wrappers/linear-mcp.ps1`
   ```powershell
   param([string]$ApiKey = $env:LINEAR_API_KEY)
   if (-not $ApiKey) { Write-Error "LINEAR_API_KEY missing"; exit 1 }
   docker run -i --rm -e LINEAR_API_KEY=$ApiKey ghcr.io/linear/mcp-server:latest
   ```

2. **Add to `.env.example`:**
   ```env
   LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxx
   ```

3. **Add to `.codex/mcp.toml`:**
   ```toml
   [mcp_servers.linear]
   command = "powershell"
   args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/tools/mcp-kit/wrappers/linear-mcp.ps1"]
   ```

4. **Update your `.env.local`** with the actual API key

## Troubleshooting

### Error: "GITHUB_PAT not found"

**Cause:** Environment variable not set

**Solutions:**
1. Create `tools/mcp-kit/.env.local` and add your token
2. Or set environment variable: `$env:GITHUB_PAT = "ghp_..."`
3. Or pass as parameter: `.\github-mcp.ps1 -Token "ghp_..."`

### Error: "docker: command not found"

**Cause:** Docker is not installed or not in PATH

**Solution:** Install Docker Desktop and ensure it's running

### Codex doesn't see the MCP server

**Possible causes:**
1. Wrong working directory - ensure Codex is opened in the repo root
2. Path error in `mcp.toml` - verify `${workspaceFolder}` resolves correctly
3. PowerShell execution policy - run task "MCP: env-check" to test

**Debug steps:**
1. Run VSCode task "MCP: env-check" → should print `OK`
2. Run VSCode task "MCP: smoke-test (GitHub)" → should list servers
3. Check Docker: `docker run -i --rm hello-world`
4. Test wrapper manually: `.\tools\mcp-kit\wrappers\github-mcp.ps1`

### High memory/CPU usage with many MCP servers

**Cause:** Running many Docker containers simultaneously

**Solutions:**
1. Use only the servers you need (disable others in `mcp.toml`)
2. Switch to Docker Compose approach for better resource management
3. Increase Docker Desktop resource limits

## Replicating to Other Repositories

To use this MCP Kit in another repository (e.g., MeepleAI):

1. **Copy the structure:**
   ```bash
   cp -r tools/mcp-kit /path/to/other-repo/tools/
   ```

2. **Copy configuration:**
   ```bash
   # Copy the MCP Kit section from .codex/mcp.toml
   # Copy the MCP tasks from .vscode/tasks.json
   ```

3. **Set up secrets:**
   ```bash
   cd /path/to/other-repo/tools/mcp-kit
   cp .env.example .env.local
   # Edit .env.local with tokens for that repository
   ```

4. **Verify:**
   ```bash
   # Run "MCP: env-check" task
   # Start Codex and verify servers are listed
   ```

This approach ensures consistent MCP setup across all your monorepos while keeping secrets isolated per machine.

## Security Best Practices

1. **Never commit secrets:**
   - ✅ `.env.local` is in `.gitignore`
   - ✅ Use `.env.example` for documentation
   - ❌ Never put tokens directly in scripts or config files

2. **Token rotation:**
   - Rotate GitHub PAT periodically (every 90 days recommended)
   - Use fine-grained tokens with minimal required scopes
   - Revoke tokens immediately if compromised

3. **Principle of least privilege:**
   - Only grant necessary scopes (repo, read:org, read:user)
   - Avoid using admin tokens for development
   - Use separate tokens per repository if needed

4. **Audit trail:**
   - Monitor GitHub Settings → Developer settings → Personal access tokens → Last used
   - Check for unexpected usage patterns

## Definition of Done (Checklist)

- [x] `tools/mcp-kit/.env.local` is git-ignored (pattern: `.env*.local`)
- [x] Wrapper scripts in `tools/mcp-kit/wrappers/` are executable
- [x] `.codex/mcp.toml` points to wrappers with relative paths (no absolute paths)
- [x] `codex mcp list` shows `github` server
- [x] No secrets committed to git
- [x] Documentation complete with examples
- [ ] User has created `.env.local` with actual tokens (you do this!)
- [ ] User has verified setup with "MCP: env-check" task

## Additional Resources

- [Claude Code MCP Documentation](https://docs.claude.com/en/docs/claude-code/mcp)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Docker STDIO Mode](https://docs.docker.com/engine/reference/run/#foreground)

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Verify your Docker installation: `docker --version`
3. Test wrapper manually: `.\tools\mcp-kit\wrappers\github-mcp.ps1`
4. Check Codex logs for detailed error messages

---

**Last updated:** 2025-01-16
**Version:** 1.0.0
**Maintainer:** InfluencerAI Team
