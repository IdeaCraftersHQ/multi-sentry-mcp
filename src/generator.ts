import type { Registry, PortfolioCompany, McpServerEntry, McpServersBlock } from './types.js';

export function buildMcpEntry(company: PortfolioCompany, shared: Registry['shared']): McpServerEntry {
  const args = [
    '@sentry/mcp-server@latest',
    `--organization-slug=${company.sentry_org_slug}`,
  ];

  if (company.sentry_project_slug) {
    args.push(`--project-slug=${company.sentry_project_slug}`);
  }

  const env: Record<string, string> = {
    SENTRY_ACCESS_TOKEN: `\${${company.token_env_var}}`,
  };

  if (company.ai_search && shared.anthropic_key_env_var) {
    env.EMBEDDED_AGENT_PROVIDER = shared.embedded_agent_provider;
    if (shared.embedded_agent_provider === 'anthropic') {
      env.ANTHROPIC_API_KEY = `\${${shared.anthropic_key_env_var}}`;
    }
  }

  if (company.skills && company.skills.length > 0) {
    env.MCP_SKILLS = company.skills.join(',');
  }

  return { command: 'npx', args, env };
}

export function generateMcpServersBlock(registry: Registry): McpServersBlock {
  const active = registry.portfolio.filter((c) => c.active);
  const mcpServers: Record<string, McpServerEntry> = {};

  for (const company of active) {
    const key = `sentry-${company.id}`;
    mcpServers[key] = buildMcpEntry(company, registry.shared);
  }

  return { mcpServers };
}

export function generateEnvTemplate(registry: Registry): string {
  const lines: string[] = [
    '# Sentry MCP Tokens',
    '# Fill from your secrets manager (1Password, etc.)',
    '',
  ];

  const active = registry.portfolio.filter((c) => c.active);

  for (const company of active) {
    lines.push(`# ${company.display_name} (${company.sentry_org_slug})`);
    lines.push(`${company.token_env_var}=`);
    lines.push('');
  }

  lines.push('# Shared');
  if (registry.shared.anthropic_key_env_var) {
    lines.push(`${registry.shared.anthropic_key_env_var}=`);
  }
  lines.push('');

  return lines.join('\n');
}

export function generateHandoffConfig(company: PortfolioCompany): McpServersBlock {
  const args = [
    '@sentry/mcp-server@latest',
    `--organization-slug=${company.sentry_org_slug}`,
  ];

  if (company.sentry_project_slug) {
    args.push(`--project-slug=${company.sentry_project_slug}`);
  }

  const env: Record<string, string> = {
    SENTRY_ACCESS_TOKEN: `\${${company.token_env_var}}`,
  };

  return {
    mcpServers: {
      sentry: { command: 'npx', args, env },
    },
  };
}

export function generateHandoffEnvTemplate(company: PortfolioCompany): string {
  return [
    `# Sentry MCP Token for ${company.display_name}`,
    `${company.token_env_var}=`,
    '',
  ].join('\n');
}

export function generateHandoffReadme(company: PortfolioCompany): string {
  return `# Sentry MCP Setup - ${company.display_name}

Standalone Sentry MCP configuration for the **${company.display_name}** organization (\`${company.sentry_org_slug}\`).

## Prerequisites

- Node.js 18+
- npm (ships with Node.js)
- A Sentry User Auth Token with these scopes:
  - \`org:read\`
  - \`project:read\`
  - \`project:write\`
  - \`team:read\`
  - \`team:write\`
  - \`event:write\`

## Setup

### 1. Create a Sentry Auth Token

1. Go to [Sentry Auth Tokens](https://sentry.io/settings/auth-tokens/)
2. Click **Create New Token**
3. Select the scopes listed above
4. Copy the token value

### 2. Set the environment variable

Add to your shell profile (\`~/.bashrc\`, \`~/.zshrc\`) or \`.envrc\`:

\`\`\`bash
export ${company.token_env_var}="your-token-here"
\`\`\`

### 3. Add to your MCP client

Copy the contents of \`mcp-config.json\` into your MCP client's config:

- **Claude Desktop:** \`~/.config/Claude/claude_desktop_config.json\`
- **Claude Code:** \`~/.claude.json\` or project \`.mcp.json\`
- **Cursor:** Settings > MCP

### 4. Restart your MCP client

The Sentry MCP server will start automatically when the client launches.

## Optional: AI-powered search

To enable natural-language issue and event search, add these to your MCP server env:

\`\`\`json
"EMBEDDED_AGENT_PROVIDER": "anthropic",
"ANTHROPIC_API_KEY": "\${ANTHROPIC_API_KEY}"
\`\`\`

And set the \`ANTHROPIC_API_KEY\` environment variable.

## Troubleshooting

- **Token expired:** Create a new token in Sentry settings and update the env var
- **Connection failed:** Ensure \`npx\` is available and \`${company.token_env_var}\` is exported
- **Missing tools:** Some tools (AI search, Seer analysis) require additional configuration
`;
}
