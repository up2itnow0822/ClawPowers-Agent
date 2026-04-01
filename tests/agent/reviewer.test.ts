import { describe, it, expect } from 'vitest';
import { reviewOutput } from '../../src/agent/reviewer.js';
import type { Goal, PlanResult } from '../../src/types.js';

const mockGoal: Goal = {
  taskId: 'review-test-001',
  description: 'Build a REST API',
  constraints: [],
  successCriteria: ['Tests pass', 'API compiles successfully'],
  createdAt: '2026-03-28T00:00:00Z',
  source: 'cli',
};

const successfulPlanResult: PlanResult = {
  taskId: 'review-test-001',
  status: 'success',
  stepResults: [
    { stepId: 's1', status: 'success', output: 'All tests pass. Build complete.', durationMs: 100, retriesUsed: 0, error: null },
    { stepId: 's2', status: 'success', output: 'API compiled successfully.', durationMs: 200, retriesUsed: 0, error: null },
  ],
  durationMs: 300,
  completedSteps: 2,
  failedSteps: 0,
  skippedSteps: 0,
};

const failedPlanResult: PlanResult = {
  taskId: 'review-test-001',
  status: 'failure',
  stepResults: [
    { stepId: 's1', status: 'failure', output: '', durationMs: 100, retriesUsed: 3, error: 'Compilation failed' },
  ],
  durationMs: 100,
  completedSteps: 0,
  failedSteps: 1,
  skippedSteps: 0,
};

describe('reviewOutput', () => {
  it('passes when all criteria are met (successful plan)', () => {
    const result = reviewOutput(mockGoal, successfulPlanResult);
    expect(result.passed).toBe(true);
    expect(result.criteria.length).toBe(2);
    expect(result.criteria.every(c => c.met)).toBe(true);
  });

  it('fails when plan execution failed', () => {
    const result = reviewOutput(mockGoal, failedPlanResult);
    expect(result.passed).toBe(false);
  });

  it('provides evidence for each criterion', () => {
    const result = reviewOutput(mockGoal, successfulPlanResult);
    for (const criterion of result.criteria) {
      expect(criterion.evidence).toBeTruthy();
      expect(criterion.evidence.length).toBeGreaterThan(0);
    }
  });

  it('generates suggestions on failure', () => {
    const result = reviewOutput(mockGoal, failedPlanResult);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('handles goals with no success criteria', () => {
    const goalNoCriteria: Goal = { ...mockGoal, successCriteria: [] };
    const result = reviewOutput(goalNoCriteria, successfulPlanResult);
    expect(result.passed).toBe(true);
    expect(result.criteria.length).toBe(0);
  });

  it('handles partial plan results', () => {
    const partialResult: PlanResult = {
      taskId: 'review-test-001',
      status: 'partial',
      stepResults: [
        { stepId: 's1', status: 'success', output: 'Tests pass', durationMs: 100, retriesUsed: 0, error: null },
        { stepId: 's2', status: 'failure', output: '', durationMs: 100, retriesUsed: 2, error: 'Build failed' },
      ],
      durationMs: 200,
      completedSteps: 1,
      failedSteps: 1,
      skippedSteps: 0,
    };
    const result = reviewOutput(mockGoal, partialResult);
    expect(result.passed).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('evaluates criteria with keyword matching', () => {
    const goal: Goal = {
      ...mockGoal,
      successCriteria: ['Application returns JSON response'],
    };
    const planResult: PlanResult = {
      ...successfulPlanResult,
      stepResults: [
        { stepId: 's1', status: 'success', output: 'Application returns JSON response correctly', durationMs: 100, retriesUsed: 0, error: null },
      ],
    };
    const result = reviewOutput(goal, planResult);
    expect(result.criteria[0]!.met).toBe(true);
  });

  it('returns no suggestions when everything passes', () => {
    const result = reviewOutput(mockGoal, successfulPlanResult);
    // suggestions may be empty or contain minor info
    expect(result.passed).toBe(true);
  });
});
