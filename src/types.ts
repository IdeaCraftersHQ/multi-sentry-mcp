export interface PortfolioCompany {
  id: string;
  display_name: string;
  sentry_org_slug: string;
  sentry_project_slug?: string;
  token_env_var: string;
  ai_search: boolean;
  active: boolean;
  skills?: string[];
}

export interface SharedConfig {
  anthropic_key_env_var: string;
  embedded_agent_provider: 'anthropic' | 'openai';
}

export interface Registry {
  portfolio: PortfolioCompany[];
  shared: SharedConfig;
}

export interface McpServerEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface McpServersBlock {
  mcpServers: Record<string, McpServerEntry>;
}

export interface CLIOptions {
  registry: string;
  outDir: string;
  handoff?: string;
  allHandoffs: boolean;
  dryRun: boolean;
}
