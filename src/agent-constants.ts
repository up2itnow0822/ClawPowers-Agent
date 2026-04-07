/**
 * Agent runtime constants: state machine and safety limits.
 * Mirrored from clawpowers (Skills) source — not re-exported by the npm entry.
 */

import { join } from 'node:path';
import type { AgentStatus } from 'clawpowers';
import { CLAWPOWERS_HOME } from 'clawpowers';

export const SKILLS_DIR = join(CLAWPOWERS_HOME, 'skills');

export const RSI_TIER_ALLOWED_MODES = {
  t1: ['auto', 'ask', 'off'] as const,
  t2: ['auto', 'ask', 'off'] as const,
  t3: ['auto', 'ask', 'off'] as const,
  t4: ['ask', 'off'] as const,
} as const;

export const SAFETY_INVARIANTS = [
  'Spending limits and SpendingPolicy',
  'Core identity and directives',
  'RSI safety tier definitions',
  'Sandbox boundaries',
  'Authentication credentials',
] as const;

export const VALID_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  idle: ['intake'],
  intake: ['planning', 'failed'],
  planning: ['executing', 'failed'],
  executing: ['reviewing', 'failed', 'paused'],
  reviewing: ['complete', 'failed', 'executing'],
  complete: ['idle'],
  failed: ['idle'],
  paused: ['executing', 'idle'],
} as const;

export const PERFORMANCE = {
  coldStartupMs: 2000,
  maxMemoryRssMb: 150,
  maxContextTokens: 2000,
  checkpointWriteMs: 100,
  episodicSearchMs: 50,
  profileSwitchMs: 500,
  healthCheckIntervalMs: 30000,
  maxRetries: 3,
} as const;
