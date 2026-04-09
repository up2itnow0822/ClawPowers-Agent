import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const profile = process.env.CLAWPOWERS_OPENCLAW_PROFILE || `clawpowers-ci-${process.pid}`;
const env = {
  ...process.env,
  CLAWPOWERS_OPENCLAW_PROFILE: profile,
};

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
run('node', ['dist/cli.js', 'init']);

const plugins = run('openclaw', ['--profile', profile, 'plugins', 'list']);
if (!/ClawPowers/i.test(plugins)) {
  throw new Error(`ClawPowers plugin was not loaded. plugins list:\n${plugins}`);
}

const localSkillsDir = join(repoRoot, 'skills');
if (!existsSync(localSkillsDir)) {
  throw new Error(`Expected synced local skills at ${localSkillsDir}`);
}

const skillsList = run('openclaw', ['--profile', profile, 'skills', 'list']);
if (!/itp|clawpowers/i.test(skillsList)) {
  throw new Error(`Expected ClawPowers skills to be visible. skills list:\n${skillsList}`);
}

console.log('OpenClaw smoke check passed.');
