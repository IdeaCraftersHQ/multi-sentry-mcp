#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Registry, CLIOptions } from './types.js';
import { validateRegistry } from './validator.js';
import {
  generateMcpServersBlock,
  generateEnvTemplate,
  generateHandoffConfig,
  generateHandoffEnvTemplate,
  generateHandoffReadme,
} from './generator.js';

function parseArgs(argv: string[]): CLIOptions {
  const opts: CLIOptions = {
    registry: './sentry-mcp-registry.json',
    outDir: './output',
    allHandoffs: false,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--registry' && argv[i + 1]) {
      opts.registry = argv[++i];
    } else if (arg.startsWith('--registry=')) {
      opts.registry = arg.split('=')[1];
    } else if (arg === '--out-dir' && argv[i + 1]) {
      opts.outDir = argv[++i];
    } else if (arg.startsWith('--out-dir=')) {
      opts.outDir = arg.split('=')[1];
    } else if (arg === '--handoff' && argv[i + 1]) {
      opts.handoff = argv[++i];
    } else if (arg.startsWith('--handoff=')) {
      opts.handoff = arg.split('=')[1];
    } else if (arg === '--all-handoffs') {
      opts.allHandoffs = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return opts;
}

function printUsage(): void {
  console.log(`
Usage: sentry-mcp-gen [options]

Generate MCP configuration for multi-org Sentry access.

Options:
  --registry <path>     Path to sentry-mcp-registry.json (default: ./sentry-mcp-registry.json)
  --out-dir <path>      Output directory (default: ./output)
  --handoff <id>        Generate handoff package for one company by id
  --all-handoffs        Generate handoff packages for all active companies
  --dry-run             Print output to stdout, don't write files
  -h, --help            Show this help message
`);
}

function writeOutput(path: string, content: string, dryRun: boolean, label: string): void {
  if (dryRun) {
    console.log(`\n--- ${label} (${path}) ---`);
    console.log(content);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
  console.log(`  wrote ${path}`);
}

function main(): void {
  const opts = parseArgs(process.argv);
  const registryPath = resolve(opts.registry);

  if (!existsSync(registryPath)) {
    console.error(`Registry file not found: ${registryPath}`);
    console.error('Create one from sentry-mcp-registry.example.json or run with --help');
    process.exit(1);
  }

  const raw = readFileSync(registryPath, 'utf-8');
  let registry: Registry;
  try {
    registry = JSON.parse(raw) as Registry;
  } catch {
    console.error(`Failed to parse registry JSON: ${registryPath}`);
    process.exit(1);
  }

  const validation = validateRegistry(registry);

  for (const w of validation.warnings) {
    console.warn(`warn: ${w}`);
  }

  if (!validation.valid) {
    for (const e of validation.errors) {
      console.error(`error: ${e}`);
    }
    process.exit(1);
  }

  const outDir = resolve(opts.outDir);
  const activeCount = registry.portfolio.filter((c) => c.active).length;

  // Generate main MCP servers config
  const mcpBlock = generateMcpServersBlock(registry);
  const mcpJson = JSON.stringify(mcpBlock, null, 2);
  writeOutput(resolve(outDir, 'mcp-servers.json'), mcpJson, opts.dryRun, 'MCP Servers Config');

  // Generate .env template
  const envTemplate = generateEnvTemplate(registry);
  writeOutput(resolve(outDir, '.env.template'), envTemplate, opts.dryRun, 'Env Template');

  console.log(`\n${activeCount} active companies configured.`);

  // Generate handoff packages
  const handoffTargets: string[] = [];
  if (opts.handoff) {
    handoffTargets.push(opts.handoff);
  } else if (opts.allHandoffs) {
    handoffTargets.push(...registry.portfolio.filter((c) => c.active).map((c) => c.id));
  }

  if (handoffTargets.length > 0) {
    let handoffCount = 0;

    for (const id of handoffTargets) {
      const company = registry.portfolio.find((c) => c.id === id);
      if (!company) {
        console.error(`Company not found in registry: "${id}"`);
        continue;
      }

      const handoffDir = resolve(outDir, 'handoff', `sentry-mcp-${id}`);

      const handoffConfig = generateHandoffConfig(company);
      writeOutput(
        resolve(handoffDir, 'mcp-config.json'),
        JSON.stringify(handoffConfig, null, 2),
        opts.dryRun,
        `Handoff Config: ${company.display_name}`,
      );

      const handoffEnv = generateHandoffEnvTemplate(company);
      writeOutput(
        resolve(handoffDir, '.env.template'),
        handoffEnv,
        opts.dryRun,
        `Handoff Env: ${company.display_name}`,
      );

      const handoffReadme = generateHandoffReadme(company);
      writeOutput(
        resolve(handoffDir, 'README.md'),
        handoffReadme,
        opts.dryRun,
        `Handoff README: ${company.display_name}`,
      );

      handoffCount++;
    }

    console.log(`${handoffCount} handoff package(s) generated.`);
  }
}

main();
