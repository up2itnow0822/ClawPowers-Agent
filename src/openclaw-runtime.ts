import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLAWPOWERS_HOME } from 'clawpowers';
import { SKILLS_DIR as CLAWPOWERS_SKILLS_DIR } from './agent-constants.js';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OPENCLAW_BIN = process.env.CLAWPOWERS_OPENCLAW_BIN ?? 'openclaw';
const EXTENSION_BUNDLE_DIR = join(CLAWPOWERS_HOME, 'openclaw-extension');

export interface OpenClawCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number;
}

interface OpenClawAgentJson {
  readonly payloads?: Array<{
    readonly text?: string | null;
    readonly mediaUrl?: string | null;
  }>;
  readonly meta?: {
    readonly stopReason?: string;
  };
  readonly outputText?: string;
  readonly output_text?: string;
  readonly text?: string;
  readonly result?: string;
}

function resolveOpenClawStateDir(): string {
  const profile = process.env.CLAWPOWERS_OPENCLAW_PROFILE;
  return profile ? join(homedir(), `.openclaw-${profile}`) : join(homedir(), '.openclaw');
}

function resolveOpenClawSkillsDir(): string {
  return join(resolveOpenClawStateDir(), 'workspace', 'skills');
}

function runOpenClaw(args: readonly string[], options?: { readonly allowFailure?: boolean }): OpenClawCommandResult {
  const profile = process.env.CLAWPOWERS_OPENCLAW_PROFILE;
  const fullArgs = profile ? ['--profile', profile, ...args] : [...args];

  const result = spawnSync(OPENCLAW_BIN, fullArgs, {
    encoding: 'utf8',
    env: process.env,
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const status = result.status ?? 1;

  if (!options?.allowFailure && status !== 0) {
    throw new Error(`openclaw ${fullArgs.join(' ')} failed (${status})\n${stderr || stdout}`.trim());
  }

  return { stdout, stderr, status };
}

function locateClawPowersSkillSourceDir(): string {
  const adjacentRepo = resolve(PACKAGE_ROOT, '..', 'ClawPowers-Skills', 'src', 'skills');
  if (existsSync(adjacentRepo)) return adjacentRepo;

  const installedCandidates = [
    resolve(PACKAGE_ROOT, 'node_modules', 'clawpowers', 'src', 'skills'),
    resolve(PACKAGE_ROOT, '..', 'clawpowers', 'src', 'skills'),
  ];

  for (const packagedSkills of installedCandidates) {
    if (existsSync(packagedSkills)) return packagedSkills;
  }

  const bundledSkills = resolve(PACKAGE_ROOT, 'skills');
  if (existsSync(bundledSkills)) return bundledSkills;

  throw new Error('Unable to locate ClawPowers skill assets for sync');
}

function syncSkillTree(sourceDir: string, targetDir: string): string[] {
  mkdirSync(targetDir, { recursive: true });
  const synced: string[] = [];

  for (const entry of readdirSync(sourceDir)) {
    const sourcePath = join(sourceDir, entry);
    if (!statSync(sourcePath).isDirectory()) continue;
    const skillMdPath = join(sourcePath, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    const targetSkillDir = join(targetDir, entry);
    rmSync(targetSkillDir, { recursive: true, force: true });
    mkdirSync(targetSkillDir, { recursive: true });
    copyFileSync(skillMdPath, join(targetSkillDir, 'SKILL.md'));
    synced.push(entry);
  }

  return synced;
}

export function syncClawPowersSkills(): string[] {
  const sourceDir = locateClawPowersSkillSourceDir();
  const synced = new Set<string>();
  for (const skill of syncSkillTree(sourceDir, CLAWPOWERS_SKILLS_DIR)) synced.add(skill);
  for (const skill of syncSkillTree(sourceDir, resolveOpenClawSkillsDir())) synced.add(skill);
  for (const skill of syncSkillTree(sourceDir, join(EXTENSION_BUNDLE_DIR, 'skills'))) synced.add(skill);
  return [...synced].sort();
}

function buildExtensionBundle(): string {
  mkdirSync(EXTENSION_BUNDLE_DIR, { recursive: true });

  const pluginSource = resolve(PACKAGE_ROOT, 'dist', 'openclaw-plugin.js');
  if (!existsSync(pluginSource)) {
    throw new Error(`Missing built OpenClaw plugin at ${pluginSource}. Run npm run build first.`);
  }

  writeFileSync(
    join(EXTENSION_BUNDLE_DIR, 'package.json'),
    JSON.stringify({
      name: 'clawpowers-agent-openclaw-extension',
      version: '1.1.6',
      type: 'module',
      openclaw: {
        extensions: ['./index.js'],
      },
    }, null, 2),
    'utf8'
  );

  writeFileSync(
    join(EXTENSION_BUNDLE_DIR, 'openclaw.plugin.json'),
    JSON.stringify({
      id: 'clawpowers-agent',
      name: 'ClawPowers Agent',
      description: 'Thin ClawPowers wrapper plugin for stock OpenClaw runtimes.',
      configSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {},
      },
      skills: ['skills'],
    }, null, 2),
    'utf8'
  );

  copyFileSync(pluginSource, join(EXTENSION_BUNDLE_DIR, 'index.js'));
  return EXTENSION_BUNDLE_DIR;
}

export function ensureClawPowersPluginInstalled(): void {
  const bundleDir = buildExtensionBundle();
  runOpenClaw(['plugins', 'install', '--link', bundleDir], { allowFailure: false });
}

export function ensureGatewayStarted(): void {
  const health = runOpenClaw(['health'], { allowFailure: true });
  if (health.status === 0) return;
  runOpenClaw(['gateway', 'start']);
}

function extractJsonPayload(raw: string): OpenClawAgentJson | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const directCandidates = [trimmed];
  const payloadMarker = trimmed.lastIndexOf('"payloads"');
  if (payloadMarker !== -1) {
    const jsonStart = trimmed.lastIndexOf('{', payloadMarker);
    if (jsonStart !== -1) {
      directCandidates.push(trimmed.slice(jsonStart));
    }
  }

  for (const candidate of directCandidates) {
    try {
      return JSON.parse(candidate) as OpenClawAgentJson;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function normalizeAgentOutput(result: OpenClawCommandResult): string {
  const parsed = extractJsonPayload(result.stdout) ?? extractJsonPayload(result.stderr);
  if (parsed) {
    const payloadText = parsed.payloads?.map((payload) => payload.text ?? '').filter(Boolean).join('\n').trim();
    if (payloadText) return payloadText;
    return parsed.outputText ?? parsed.output_text ?? parsed.text ?? parsed.result ?? '';
  }

  return result.stdout.trim() || result.stderr.trim();
}

export function runWrappedAgentTurn(task: string): string {
  ensureClawPowersPluginInstalled();
  syncClawPowersSkills();
  ensureGatewayStarted();

  const result = runOpenClaw(['agent', '--local', '--agent', 'main', '--message', task, '--json']);
  return normalizeAgentOutput(result);
}

export function getOpenClawRuntimeStatus(): { readonly gatewayHealthy: boolean; readonly skillsDir: string } {
  const health = runOpenClaw(['health'], { allowFailure: true });
  return {
    gatewayHealthy: health.status === 0,
    skillsDir: resolveOpenClawSkillsDir(),
  };
}

export { CLAWPOWERS_HOME };
