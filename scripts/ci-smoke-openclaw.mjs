import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = process.cwd();
const profile = process.env.CLAWPOWERS_OPENCLAW_PROFILE || `clawpowers-ci-${process.pid}`;
const useMockOpenClaw =
  process.argv.includes('--mock-openclaw') || process.env.CLAWPOWERS_SMOKE_MOCK_OPENCLAW === '1';
const env = {
  ...process.env,
  CLAWPOWERS_OPENCLAW_PROFILE: profile,
};
let openClawCommand = 'openclaw';
let openClawBaseArgs = [];

if (useMockOpenClaw) {
  const mockBinDir = mkdtempSync(join(tmpdir(), 'clawpowers-openclaw-mock-'));
  const mockScript = join(mockBinDir, 'mock-openclaw.mjs');
  const mockOpenClaw = `#!/usr/bin/env node
const args = process.argv.slice(2);
const commandStart = args[0] === '--profile' ? 2 : 0;
const command = args[commandStart];
const subcommand = args[commandStart + 1];

if (command === 'plugins' && subcommand === 'install') {
  console.log('Installed ClawPowers Agent plugin');
  process.exit(0);
}

if (command === 'plugins' && subcommand === 'list') {
  console.log('ClawPowers Agent');
  process.exit(0);
}

if (command === 'skills' && subcommand === 'list') {
  console.log('itp');
  console.log('clawpowers');
  process.exit(0);
}

if (command === 'health') {
  console.log('ok');
  process.exit(0);
}

if (command === 'gateway' && subcommand === 'start') {
  console.log('gateway started');
  process.exit(0);
}

if (command === 'agent') {
  const messageIndex = args.indexOf('--message');
  const message = messageIndex === -1 ? '' : args[messageIndex + 1] ?? '';
  console.log(JSON.stringify({ payloads: [{ text: 'MOCK_PROVIDER_READY: ' + message }] }));
  process.exit(0);
}

console.error('Unexpected mock openclaw invocation: ' + args.join(' '));
process.exit(1);
`;

  writeFileSync(mockScript, mockOpenClaw, 'utf8');
  chmodSync(mockScript, 0o755);
  writeFileSync(join(mockBinDir, 'openclaw.cmd'), `@echo off\r\n"${process.execPath}" "${mockScript}" %*\r\n`, 'utf8');
  writeFileSync(join(mockBinDir, 'openclaw'), `#!/bin/sh\nexec "${process.execPath}" "${mockScript}" "$@"\n`, 'utf8');
  chmodSync(join(mockBinDir, 'openclaw'), 0o755);
  env.CLAWPOWERS_OPENCLAW_BIN = process.execPath;
  env.CLAWPOWERS_OPENCLAW_BIN_ARGS = JSON.stringify([mockScript]);
  env.PATH = `${mockBinDir}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`;
  env.CLAWPOWERS_SMOKE_MOCK_OPENCLAW = '1';
  openClawCommand = process.execPath;
  openClawBaseArgs = [mockScript];
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

console.log(`Using OpenClaw profile: ${profile}`);
if (useMockOpenClaw) {
  console.log('Using deterministic mock OpenClaw runtime.');
}
run('node', ['dist/cli.js', 'init']);

const plugins = run(openClawCommand, [...openClawBaseArgs, '--profile', profile, 'plugins', 'list']);
if (!/ClawPowers/i.test(plugins)) {
  throw new Error(`ClawPowers plugin was not loaded. plugins list:\n${plugins}`);
}

const localSkillsDir = join(repoRoot, 'skills');
if (!existsSync(localSkillsDir)) {
  throw new Error(`Expected synced local skills at ${localSkillsDir}`);
}

const skillsList = run(openClawCommand, [...openClawBaseArgs, '--profile', profile, 'skills', 'list']);
if (!/itp|clawpowers/i.test(skillsList)) {
  throw new Error(`Expected ClawPowers skills to be visible. skills list:\n${skillsList}`);
}

if (useMockOpenClaw) {
  const runOutput = run('node', [
    'dist/cli.js',
    'run',
    'Reply with MOCK_PROVIDER_READY and the active wrapper status.',
  ]);
  if (!/MOCK_PROVIDER_READY/.test(runOutput)) {
    throw new Error(`Expected clawpowers run to route through mock provider path. output:\n${runOutput}`);
  }
}

console.log(`OpenClaw smoke check passed${useMockOpenClaw ? ' with mock provider path' : ''}.`);
