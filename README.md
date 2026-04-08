# sentry-mcp-multi

Multi-org Sentry MCP configuration generator. Run multiple Sentry organizations simultaneously in Claude Desktop, Claude Code, or Cursor — each with isolated tokens, org-scoped sessions, and zero cross-org leakage.

## Why

The official [`@sentry/mcp-server`](https://github.com/getsentry/sentry-mcp) supports one org per MCP instance. If you manage multiple companies (venture studio, agency, consultancy), you need N separate MCP entries — one per org, each with its own token and `--organization-slug` constraint.

This tool generates that config from a single registry file and produces standalone handoff packages when a company exits your portfolio.

## Quick Start

```bash
git clone https://github.com/your-username/sentry-mcp-multi.git
cd sentry-mcp-multi
npm install && npm run build

# Create your registry from the example
cp sentry-mcp-registry.example.json sentry-mcp-registry.json
# Edit with your real org slugs and token var names

# Generate config
npm run generate
```

Output lands in `output/`:

```
output/
  mcp-servers.json    # Paste into your MCP client config
  .env.template       # Token var names to fill from your secrets manager
```

## Registry Format

```json
{
  "portfolio": [
    {
      "id": "acme-web",
      "display_name": "Acme Web",
      "sentry_org_slug": "acme-web",
      "sentry_project_slug": "acme-web-app",
      "token_env_var": "SENTRY_TOKEN_ACME_WEB",
      "ai_search": true,
      "active": true,
      "skills": ["inspect", "seer", "triage"]
    }
  ],
  "shared": {
    "anthropic_key_env_var": "ANTHROPIC_API_KEY",
    "embedded_agent_provider": "anthropic"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Internal identifier, used in MCP server name (`sentry-<id>`) |
| `display_name` | Yes | Human-readable name |
| `sentry_org_slug` | Yes | From your Sentry org URL: `sentry.io/organizations/<slug>/` |
| `sentry_project_slug` | No | Passed as `--project-slug` to constrain to a single project |
| `token_env_var` | Yes | Env var name holding the Sentry token (pattern: `SENTRY_TOKEN_[A-Z_]+`) |
| `ai_search` | Yes | Enable AI-powered issue/event search (requires Anthropic or OpenAI key) |
| `active` | Yes | Set to `false` to exclude from generated config |
| `skills` | No | Limit Sentry MCP skills: `inspect`, `seer`, `docs`, `triage`, `project-management` |

## CLI Options

```
Usage: sentry-mcp-gen [options]

Options:
  --registry <path>     Path to registry JSON (default: ./sentry-mcp-registry.json)
  --out-dir <path>      Output directory (default: ./output)
  --handoff <id>        Generate handoff package for one company
  --all-handoffs        Generate handoff packages for all active companies
  --dry-run             Print to stdout instead of writing files
  -h, --help            Show help
```

## Generated Output

For a registry with two companies (`acme-web` and `widgets-inc`), the generator produces:

```json
{
  "mcpServers": {
    "sentry-acme-web": {
      "command": "npx",
      "args": [
        "@sentry/mcp-server@latest",
        "--organization-slug=acme-web",
        "--project-slug=acme-web-app"
      ],
      "env": {
        "SENTRY_ACCESS_TOKEN": "${SENTRY_TOKEN_ACME_WEB}",
        "EMBEDDED_AGENT_PROVIDER": "anthropic",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    },
    "sentry-widgets-inc": {
      "command": "npx",
      "args": [
        "@sentry/mcp-server@latest",
        "--organization-slug=widgets-inc",
        "--project-slug=widgets-api"
      ],
      "env": {
        "SENTRY_ACCESS_TOKEN": "${SENTRY_TOKEN_WIDGETS_INC}",
        "EMBEDDED_AGENT_PROVIDER": "anthropic",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

Each MCP client spawns separate `@sentry/mcp-server` processes. Each process authenticates with its own token and is constrained to its org via `--organization-slug`. Cross-org queries are impossible by design.

## Handoff Packages

When a company exits your portfolio:

```bash
npm run generate -- --handoff acme-web
```

Produces a self-contained folder:

```
output/handoff/sentry-mcp-acme-web/
  mcp-config.json     # Standalone MCP config with org slug, no shared keys
  .env.template       # Just their token var
  README.md           # Step-by-step setup guide
```

Hand this to the exiting team. No dependency on your infrastructure.

## Token Setup

Each Sentry org needs a User Auth Token with these scopes:

- `org:read`
- `project:read`
- `project:write`
- `team:read`
- `team:write`
- `event:write`

Create tokens at [Sentry Auth Tokens](https://sentry.io/settings/auth-tokens/).

Store tokens as environment variables (`.envrc`, shell profile, or secrets manager). The generated config references `${VAR_NAME}` — your MCP client resolves these from the environment at runtime.

## Adding to Claude Code

You can either paste the generated `mcp-servers.json` content into your config, or use the CLI:

```bash
claude mcp add sentry-acme-web -s user \
  -e 'SENTRY_ACCESS_TOKEN=your-token-here' \
  -- npx @sentry/mcp-server@latest --organization-slug=acme-web
```

## Sentry MCP Skills

The `@sentry/mcp-server` groups tools into skills:

| Skill | Default | Tools |
|-------|---------|-------|
| `inspect` | ON | `find_organizations`, `find_projects`, `find_teams`, `find_releases`, `find_dsns`, `list_issues`, `list_events`, `search_issues`\*, `search_events`\*, `get_sentry_resource` |
| `seer` | ON | `analyze_issue_with_seer` |
| `docs` | OFF | `search_docs`, `get_doc` |
| `triage` | OFF | `update_issue` |
| `project-management` | OFF | `create_project`, `create_team`, `create_dsn`, `update_project` |

\*Requires AI provider configuration (Anthropic or OpenAI key).

Use the `skills` field in the registry to control which skills are enabled per company.

## Author                                                                                                                                                                                   
                                                                     
**Abdelbaki Berkati** — [berkati.xyz](https://berkati.xyz) · [@bakissation](https://github.com/bakissation)                                                                                 
                                                                     
[Read the case study →](https://berkati.xyz/case-studies/multi-sentry-mcp/)                                                                                                                 
                      
## License

MIT
