/**
 * ClawPowers Agent — Gateway Config Generator
 * Generates OpenClaw gateway config YAML pointing to ClawPowers skills directory.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import yaml from 'js-yaml';
import { VERSION, CLAWPOWERS_HOME } from 'clawpowers';
import type { ConfigFile, ProfileName } from 'clawpowers';
import { SKILLS_DIR } from './agent-constants.js';

// ─── Gateway Config Types ─────────────────────────────────────────────────────

export interface GatewaySkillConfig {
  readonly name: string;
  readonly path: string;
}

export interface GatewayConfig {
  readonly version: string;
  readonly agent: {
    readonly name: string;
    readonly profile: ProfileName;
  };
  readonly skills: {
    readonly directory: string;
    readonly active: readonly string[];
  };
  readonly runtime: {
    readonly model: string;
    readonly maxConcurrentAgents: number;
  };
  readonly paths: {
    readonly home: string;
    readonly logs: string;
    readonly memory: string;
    readonly metrics: string;
  };
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateGatewayConfig(
  config: ConfigFile,
  activeSkills: readonly string[]
): GatewayConfig {
  return {
    version: VERSION,
    agent: {
      name: 'clawpowers',
      profile: config.profile,
    },
    skills: {
      directory: config.skillsDir ?? SKILLS_DIR,
      active: activeSkills,
    },
    runtime: {
      model: 'anthropic/claude-sonnet-4',
      maxConcurrentAgents: 3,
    },
    paths: {
      home: CLAWPOWERS_HOME,
      logs: join(CLAWPOWERS_HOME, 'logs'),
      memory: join(CLAWPOWERS_HOME, 'memory'),
      metrics: join(CLAWPOWERS_HOME, 'metrics'),
    },
  };
}

/**
 * Write gateway config YAML to a file.
 */
export function writeGatewayConfig(
  config: ConfigFile,
  activeSkills: readonly string[],
  outputPath?: string
): string {
  const gatewayConfig = generateGatewayConfig(config, activeSkills);
  const yamlContent = yaml.dump(gatewayConfig, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  const filePath = outputPath ?? join(CLAWPOWERS_HOME, 'gateway.yaml');
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, yamlContent, 'utf-8');
  return filePath;
}

/**
 * Generate gateway config as a YAML string (no file write).
 */
export function gatewayConfigToYaml(
  config: ConfigFile,
  activeSkills: readonly string[]
): string {
  const gatewayConfig = generateGatewayConfig(config, activeSkills);
  return yaml.dump(gatewayConfig, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
}
