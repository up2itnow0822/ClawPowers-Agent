import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locateClawPowersSkillSourceDir } from '../src/openclaw-runtime.js';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('OpenClaw runtime skill source lookup', () => {
  it('prefers the bundled full skill catalog over source helper directories', () => {
    const bundledSkills = resolve(PACKAGE_ROOT, 'skills');

    expect(existsSync(bundledSkills)).toBe(true);
    expect(locateClawPowersSkillSourceDir()).toBe(bundledSkills);

    const skillCount = readdirSync(locateClawPowersSkillSourceDir(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .length;
    expect(skillCount).toBeGreaterThan(10);
  });
});
