import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const expectedAgent = pkg.version;
const expectedOpenClaw = pkg.peerDependencies?.openclaw;
const expectedClawPowers = pkg.peerDependencies?.clawpowers;

if (!expectedAgent || !expectedOpenClaw || !expectedClawPowers) {
  throw new Error('package.json must declare version, peerDependencies.openclaw, and peerDependencies.clawpowers');
}

const checks = [
  { file: 'README.md', required: [expectedAgent, expectedOpenClaw] },
  { file: 'COMPATIBILITY.md', required: [expectedAgent, expectedOpenClaw, expectedClawPowers.replace('^', '')] },
  { file: 'CHANGELOG.md', required: [`[${expectedAgent}]`] },
  { file: 'RELEASING.md', required: [expectedAgent] },
  { file: 'src/openclaw-runtime.ts', forbidden: [/version:\s*['"][0-9]+\.[0-9]+\.[0-9]+['"]/] },
];

const staleVersionPatterns = [/1\.1\.7/g, /2026\.4\.14/g];
const staleAllowlist = new Map([
  ['CHANGELOG.md', [/## \[1\.1\.7\]/, /Updated the compatibility matrix to reflect the live `clawpowers` 2\.2\.5 release/]],
  ['RELEASING.md', [/\| 1\.1\.7 \|/]],
]);

const failures = [];

for (const check of checks) {
  const text = readFileSync(join(repoRoot, check.file), 'utf8');
  for (const required of check.required ?? []) {
    if (!text.includes(required)) failures.push(`${check.file} missing expected release surface: ${required}`);
  }
  for (const forbidden of check.forbidden ?? []) {
    if (forbidden.test(text)) failures.push(`${check.file} contains forbidden hardcoded runtime version: ${forbidden}`);
  }
}

for (const file of ['README.md', 'COMPATIBILITY.md', 'CHANGELOG.md', 'RELEASING.md', 'src/openclaw-runtime.ts', 'package.json']) {
  const text = readFileSync(join(repoRoot, file), 'utf8');
  const allow = staleAllowlist.get(file) ?? [];
  for (const pattern of staleVersionPatterns) {
    const matches = text.match(pattern) ?? [];
    for (const _match of matches) {
      const allowed = allow.some((allowedPattern) => allowedPattern.test(text));
      if (!allowed) failures.push(`${file} contains stale version pattern ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`release surfaces OK: clawpowers-agent ${expectedAgent}, openclaw ${expectedOpenClaw}, clawpowers ${expectedClawPowers}`);
