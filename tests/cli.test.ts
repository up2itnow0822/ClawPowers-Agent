/**
 * CLI tests — help output and command structure
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const CLI_PATH = join(import.meta.dirname, '..', 'src', 'cli.ts');
const TSX = 'npx';

function runCLI(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync(TSX, ['tsx', CLI_PATH, ...args], {
      encoding: 'utf-8',
      timeout: 15000,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (err.stdout ?? '') + (err.stderr ?? ''),
      exitCode: err.status ?? 1,
    };
  }
}

describe('CLI', () => {
  it('--help shows program description', () => {
    const { stdout, exitCode } = runCLI(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('clawpowers');
    expect(stdout).toContain('Autonomous AI coding agent');
  });

  it('--version shows version', () => {
    const { stdout, exitCode } = runCLI(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('1.1.0');
  });

  it('--help lists all commands', () => {
    const { stdout } = runCLI(['--help']);
    expect(stdout).toContain('run');
    expect(stdout).toContain('status');
    expect(stdout).toContain('init');
    expect(stdout).toContain('config');
    expect(stdout).toContain('skills');
  });

  it('config --help shows get/set subcommands', () => {
    const { stdout, exitCode } = runCLI(['config', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('get');
    expect(stdout).toContain('set');
  });

  it('skills --help shows list/add/remove subcommands', () => {
    const { stdout, exitCode } = runCLI(['skills', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('list');
    expect(stdout).toContain('add');
    expect(stdout).toContain('remove');
  });

  it('config set rsi.tiers.t4 auto exits non-zero', () => {
    const { exitCode, stdout } = runCLI(['config', 'set', 'rsi.tiers.t4', 'auto']);
    expect(exitCode).not.toBe(0);
    expect(stdout).toContain('T4');
  });
});
