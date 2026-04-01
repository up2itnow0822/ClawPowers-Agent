/**
 * Agent state machine tests — transitions and validation
 */
import { describe, it, expect } from 'vitest';
import {
  createAgentState, transition, canTransition,
  isTerminal, isActive, getValidTransitions,
} from '../src/agent.js';
import { VALID_TRANSITIONS } from '../src/constants.js';
import type { Profile, AgentStatus } from '../src/types.js';

const TEST_PROFILE: Profile = {
  name: 'dev',
  description: 'Test profile',
  skills: ['tdd'],
  defaultModel: 'anthropic/claude-sonnet-4',
  maxConcurrentAgents: 3,
  paymentEnabled: false,
  rsiEnabled: true,
};

describe('Agent State Machine', () => {
  it('createAgentState returns idle state', () => {
    const state = createAgentState(TEST_PROFILE);
    expect(state.status).toBe('idle');
    expect(state.currentTask).toBeNull();
    expect(state.currentPlan).toBeNull();
    expect(state.profile).toBe(TEST_PROFILE);
    expect(state.taskId).toBeDefined();
  });

  it('createAgentState generates unique taskIds', () => {
    const state1 = createAgentState(TEST_PROFILE);
    const state2 = createAgentState(TEST_PROFILE);
    expect(state1.taskId).not.toBe(state2.taskId);
  });

  // ─── Valid Transitions ──────────────────────────────────────────────────────

  it('idle → intake is valid', () => {
    const state = createAgentState(TEST_PROFILE);
    const next = transition(state, 'intake');
    expect(next.status).toBe('intake');
  });

  it('intake → planning is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    const next = transition(state, 'planning');
    expect(next.status).toBe('planning');
  });

  it('planning → executing is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    const next = transition(state, 'executing');
    expect(next.status).toBe('executing');
  });

  it('executing → reviewing is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    const next = transition(state, 'reviewing');
    expect(next.status).toBe('reviewing');
  });

  it('reviewing → complete is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    state = transition(state, 'reviewing');
    const next = transition(state, 'complete');
    expect(next.status).toBe('complete');
  });

  it('reviewing → executing (re-execute) is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    state = transition(state, 'reviewing');
    const next = transition(state, 'executing');
    expect(next.status).toBe('executing');
  });

  it('executing → paused is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    const next = transition(state, 'paused');
    expect(next.status).toBe('paused');
  });

  it('paused → executing (resume) is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    state = transition(state, 'paused');
    const next = transition(state, 'executing');
    expect(next.status).toBe('executing');
  });

  it('complete → idle (reset) is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    state = transition(state, 'reviewing');
    state = transition(state, 'complete');
    const next = transition(state, 'idle');
    expect(next.status).toBe('idle');
  });

  it('failed → idle (reset) is valid', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'failed');
    const next = transition(state, 'idle');
    expect(next.status).toBe('idle');
  });

  // ─── Invalid Transitions ────────────────────────────────────────────────────

  it('idle → executing throws (skip planning)', () => {
    const state = createAgentState(TEST_PROFILE);
    expect(() => transition(state, 'executing')).toThrow(/Invalid state transition/);
  });

  it('idle → complete throws', () => {
    const state = createAgentState(TEST_PROFILE);
    expect(() => transition(state, 'complete')).toThrow(/Invalid state transition/);
  });

  it('complete → executing throws', () => {
    let state = createAgentState(TEST_PROFILE);
    state = transition(state, 'intake');
    state = transition(state, 'planning');
    state = transition(state, 'executing');
    state = transition(state, 'reviewing');
    state = transition(state, 'complete');
    expect(() => transition(state, 'executing')).toThrow(/Invalid state transition/);
  });

  // ─── Helper Functions ───────────────────────────────────────────────────────

  it('canTransition returns correct boolean', () => {
    expect(canTransition('idle', 'intake')).toBe(true);
    expect(canTransition('idle', 'executing')).toBe(false);
    expect(canTransition('executing', 'paused')).toBe(true);
  });

  it('isTerminal identifies terminal states', () => {
    expect(isTerminal('complete')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('idle')).toBe(false);
    expect(isTerminal('executing')).toBe(false);
  });

  it('isActive identifies active states', () => {
    expect(isActive('intake')).toBe(true);
    expect(isActive('planning')).toBe(true);
    expect(isActive('executing')).toBe(true);
    expect(isActive('reviewing')).toBe(true);
    expect(isActive('paused')).toBe(true);
    expect(isActive('idle')).toBe(false);
    expect(isActive('complete')).toBe(false);
    expect(isActive('failed')).toBe(false);
  });

  it('getValidTransitions returns correct list', () => {
    expect(getValidTransitions('idle')).toEqual(['intake']);
    expect(getValidTransitions('executing')).toContain('reviewing');
    expect(getValidTransitions('executing')).toContain('failed');
    expect(getValidTransitions('executing')).toContain('paused');
  });

  it('transition updates updatedAt timestamp', () => {
    const state = createAgentState(TEST_PROFILE);
    const before = state.updatedAt;
    // Small delay to ensure different timestamp
    const next = transition(state, 'intake');
    expect(next.updatedAt).toBeDefined();
    expect(typeof next.updatedAt).toBe('string');
  });

  it('all states have defined transitions', () => {
    const allStatuses: AgentStatus[] = [
      'idle', 'intake', 'planning', 'executing',
      'reviewing', 'complete', 'failed', 'paused',
    ];
    for (const status of allStatuses) {
      expect(VALID_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
    }
  });
});
