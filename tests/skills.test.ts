/**
 * Skill loader tests — discovery, frontmatter parsing, filtering
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  parseFrontmatter, loadSkillManifest, discoverSkills,
  getActiveSkills, listSkillsWithStatus,
} from '../src/skills.js';
import type { Profile } from '../src/types.js';

describe('Skill Loader', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clawpowers-skills-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ─── Frontmatter Parsing ────────────────────────────────────────────────────

  it('parseFrontmatter extracts name and description', () => {
    const content = `---
name: tdd
description: "Test-driven development"
---
Instructions here.`;
    const result = parseFrontmatter(content);
    expect(result.name).toBe('tdd');
    expect(result.description).toBe('Test-driven development');
  });

  it('parseFrontmatter extracts requirements', () => {
    const content = `---
name: git-skill
description: "Git workflow"
metadata:
  openclaw:
    requires:
      bins: ["node", "git"]
      env: ["GITHUB_TOKEN"]
---
Instructions.`;
    const result = parseFrontmatter(content);
    expect(result.metadata?.openclaw?.requires?.bins).toEqual(['node', 'git']);
    expect(result.metadata?.openclaw?.requires?.env).toEqual(['GITHUB_TOKEN']);
  });

  it('parseFrontmatter returns empty for no frontmatter', () => {
    const content = 'Just markdown, no frontmatter.';
    const result = parseFrontmatter(content);
    expect(result.name).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  // ─── Skill Discovery ───────────────────────────────────────────────────────

  it('loadSkillManifest loads valid skill', () => {
    const skillDir = join(testDir, 'tdd');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: tdd
description: "Test-driven development"
---
Use TDD.`);

    const manifest = loadSkillManifest(skillDir);
    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe('tdd');
    expect(manifest!.description).toBe('Test-driven development');
    expect(manifest!.path).toBe(skillDir);
  });

  it('loadSkillManifest returns null for missing SKILL.md', () => {
    const skillDir = join(testDir, 'empty-skill');
    mkdirSync(skillDir);
    const manifest = loadSkillManifest(skillDir);
    expect(manifest).toBeNull();
  });

  it('loadSkillManifest returns null for invalid frontmatter', () => {
    const skillDir = join(testDir, 'bad-skill');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), 'No frontmatter here.');
    const manifest = loadSkillManifest(skillDir);
    expect(manifest).toBeNull();
  });

  it('discoverSkills finds all valid skills', () => {
    // Create 3 skill dirs, one invalid
    for (const name of ['tdd', 'debug', 'review']) {
      const dir = join(testDir, name);
      mkdirSync(dir);
      writeFileSync(join(dir, 'SKILL.md'), `---
name: ${name}
description: "${name} skill"
---
Instructions.`);
    }
    // Invalid - no SKILL.md
    mkdirSync(join(testDir, 'broken'));

    const skills = discoverSkills(testDir);
    expect(skills).toHaveLength(3);
    expect(skills.map(s => s.name)).toEqual(['debug', 'review', 'tdd']); // sorted
  });

  it('discoverSkills returns empty for nonexistent dir', () => {
    const skills = discoverSkills('/nonexistent/path');
    expect(skills).toEqual([]);
  });

  // ─── Profile Filtering ─────────────────────────────────────────────────────

  it('getActiveSkills filters by profile', () => {
    const allSkills = [
      { name: 'tdd', description: 'TDD', path: '/a', requirements: null },
      { name: 'debug', description: 'Debug', path: '/b', requirements: null },
      { name: 'review', description: 'Review', path: '/c', requirements: null },
    ];
    const profile: Profile = {
      name: 'dev',
      description: 'Dev',
      skills: ['tdd', 'review'],
      defaultModel: 'anthropic/claude-sonnet-4',
      maxConcurrentAgents: 3,
      paymentEnabled: false,
      rsiEnabled: true,
    };
    const active = getActiveSkills(allSkills, profile);
    expect(active).toHaveLength(2);
    expect(active.map(s => s.name)).toEqual(['tdd', 'review']);
  });

  it('listSkillsWithStatus shows active/inactive', () => {
    const allSkills = [
      { name: 'tdd', description: 'TDD', path: '/a', requirements: null },
      { name: 'debug', description: 'Debug', path: '/b', requirements: null },
    ];
    const profile: Profile = {
      name: 'dev',
      description: 'Dev',
      skills: ['tdd'],
      defaultModel: 'anthropic/claude-sonnet-4',
      maxConcurrentAgents: 3,
      paymentEnabled: false,
      rsiEnabled: true,
    };
    const result = listSkillsWithStatus(allSkills, profile);
    expect(result).toHaveLength(2);
    expect(result[0]!.active).toBe(true);
    expect(result[1]!.active).toBe(false);
  });
});
