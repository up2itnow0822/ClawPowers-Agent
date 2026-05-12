#!/usr/bin/env node
/**
 * Clean consumer install smoke for the packed ClawPowers Agent tarball.
 *
 * This validates the real npm-consumer path instead of only checking local build
 * output: tarball install, peer OpenClaw install, CLI bin wiring, init/status UX,
 * packaged skill sync, and plugin metadata loading.
 */
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const openclawVersion = pkg.peerDependencies?.openclaw;
if (!openclawVersion) throw new Error('Missing peerDependencies.openclaw');

function commandSpec(command, args) {
  if (process.env.npm_execpath && command === 'npm') {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args] };
  }
  if (process.env.npm_execpath && command === 'npx') {
    const normalized = args[0] === '--no-install' ? args.slice(1) : args;
    return { command: process.execPath, args: [process.env.npm_execpath, 'exec', '--no', '--', ...normalized] };
  }
  return { command, args };
}

function run(command, args, options = {}) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    if (result.error) process.stderr.write(`${result.error.stack ?? result.error}\n`);
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}`);
  }
  return result;
}

function parsePackJson(stdout) {
  let pos = stdout.lastIndexOf('[');
  while (pos >= 0) {
    try {
      return JSON.parse(stdout.slice(pos));
    } catch {
      pos = stdout.lastIndexOf('[', pos - 1);
    }
  }
  throw new Error(`Could not parse npm pack JSON output:\n${stdout.slice(0, 800)}`);
}

const pack = run('npm', ['pack', '--json'], { capture: true });
const packed = parsePackJson(pack.stdout ?? '');
const filename = packed[0]?.filename;
if (!filename) throw new Error('npm pack did not report a tarball filename');
const tarball = resolve(repoRoot, filename);

const temp = mkdtempSync(join(tmpdir(), 'clawpowers-agent-consumer-'));
const fakeHome = join(temp, 'home');
try {
  run('npm', ['init', '-y'], { cwd: temp, capture: true });
  run('npm', ['install', tarball, `openclaw@${openclawVersion}`, '--save-exact', '--ignore-scripts'], { cwd: temp });

  const env = {
    HOME: fakeHome,
    USERPROFILE: fakeHome,
    APPDATA: join(fakeHome, 'AppData', 'Roaming'),
    LOCALAPPDATA: join(fakeHome, 'AppData', 'Local'),
    CLAWPOWERS_HOME: join(fakeHome, '.clawpowers'),
  };

  const version = run('npx', ['--no-install', 'clawpowers', '--version'], { cwd: temp, env, capture: true }).stdout.trim();
  if (version !== pkg.version) throw new Error(`Expected CLI version ${pkg.version}, saw ${version}`);

  run('npx', ['--no-install', 'openclaw', '--version'], { cwd: temp, env, capture: true });
  run('npx', ['--no-install', 'clawpowers', 'init'], { cwd: temp, env });
  const status = run('npx', ['--no-install', 'clawpowers', 'status'], { cwd: temp, env, capture: true }).stdout;
  if (!status.includes(`ClawPowers Agent v${pkg.version}`)) throw new Error('Status output missing agent version');
  if (!/Skills:\s+[1-9][0-9]* discovered/.test(status)) throw new Error(`Status output did not report discovered skills:\n${status}`);

  const smoke = `
    import { createAgentState, createClawPowersPlugin } from 'clawpowers-agent';
    const state = createAgentState({ name: 'consumer-smoke', description: 'consumer smoke', skills: [], defaultModel: 'test/model', maxConcurrentAgents: 1, paymentEnabled: false, rsiEnabled: true });
    if (state.profile.name !== 'consumer-smoke') throw new Error('createAgentState export failed');
    const plugin = createClawPowersPlugin();
    if (!plugin || plugin.name !== 'clawpowers') throw new Error('OpenClaw plugin export failed');
    console.log('consumer smoke OK: clawpowers-agent ${pkg.version}');
  `;
  run('node', ['--input-type=module', '--eval', smoke], { cwd: temp, env });
} finally {
  rmSync(temp, { recursive: true, force: true });
  if (existsSync(tarball)) rmSync(tarball, { force: true });
}
