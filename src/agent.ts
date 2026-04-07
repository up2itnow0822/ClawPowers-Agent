/**
 * ClawPowers Agent — Agent State Machine
 * Factory for AgentState, validated state transitions.
 */

import { randomUUID } from 'node:crypto';
import { VALID_TRANSITIONS } from './agent-constants.js';
import type { AgentState } from './agent-types.js';
import type { AgentStatus, Profile, MemoryStats } from 'clawpowers';

// ─── Factory ──────────────────────────────────────────────────────────────────

const DEFAULT_MEMORY_STATS: MemoryStats = {
  workingCount: 0,
  episodicCount: 0,
  proceduralCount: 0,
  lastCheckpoint: null,
  memoryBytes: 0,
};

export function createAgentState(profile: Profile): AgentState {
  const now = new Date().toISOString();
  return {
    taskId: randomUUID(),
    currentTask: null,
    currentPlan: null,
    status: 'idle',
    profile,
    memoryStats: DEFAULT_MEMORY_STATS,
    startedAt: now,
    updatedAt: now,
  };
}

// ─── State Transitions ───────────────────────────────────────────────────────

export function canTransition(from: AgentStatus, to: AgentStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed.includes(to);
}

export function transition(state: AgentState, to: AgentStatus): AgentState {
  if (!canTransition(state.status, to)) {
    throw new Error(
      `Invalid state transition: ${state.status} → ${to}. ` +
      `Allowed transitions from "${state.status}": ${VALID_TRANSITIONS[state.status].join(', ')}`
    );
  }
  return {
    ...state,
    status: to,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export function isTerminal(status: AgentStatus): boolean {
  return status === 'complete' || status === 'failed';
}

export function isActive(status: AgentStatus): boolean {
  return status !== 'idle' && status !== 'complete' && status !== 'failed';
}

export function getValidTransitions(status: AgentStatus): readonly AgentStatus[] {
  return VALID_TRANSITIONS[status];
}
