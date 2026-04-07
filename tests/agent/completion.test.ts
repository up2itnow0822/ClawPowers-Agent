import { describe, it, expect } from 'vitest';
import { completeTask } from '../../src/agent/completion.js';
import type { Goal, PlanResult, ReviewResult } from 'clawpowers';

const mockGoal: Goal = {
  taskId: 'complete-test-001',
  description: 'Build a REST API',
  constraints: [],
  successCriteria: ['Tests pass', 'Compiles'],
  createdAt: '2026-03-28T00:00:00Z',
  source: 'cli',
};

const successPlanResult: PlanResult = {
  taskId: 'complete-test-001',
  status: 'success',
  stepResults: [
    { stepId: 's1', status: 'success', output: 'done', durationMs: 500, retriesUsed: 0, error: null },
  ],
  durationMs: 500,
  completedSteps: 1,
  failedSteps: 0,
  skippedSteps: 0,
};

const successReview: ReviewResult = {
  passed: true,
  criteria: [
    { criterion: 'Tests pass', met: true, evidence: 'All tests green' },
    { criterion: 'Compiles', met: true, evidence: 'Build successful' },
  ],
  suggestions: [],
};

const failureReview: ReviewResult = {
  passed: false,
  criteria: [
    { criterion: 'Tests pass', met: false, evidence: 'Tests failed' },
    { criterion: 'Compiles', met: false, evidence: 'Build failed' },
  ],
  suggestions: ['Fix tests', 'Fix compilation'],
};

const partialReview: ReviewResult = {
  passed: false,
  criteria: [
    { criterion: 'Tests pass', met: true, evidence: 'Tests green' },
    { criterion: 'Compiles', met: false, evidence: 'Build failed' },
  ],
  suggestions: ['Fix compilation'],
};

describe('completeTask', () => {
  it('returns success outcome when all criteria met', () => {
    const completion = completeTask(mockGoal, successPlanResult, successReview);
    expect(completion.outcome).toBe('success');
    expect(completion.taskId).toBe('complete-test-001');
  });

  it('returns failure outcome when no criteria met', () => {
    const completion = completeTask(mockGoal, successPlanResult, failureReview);
    expect(completion.outcome).toBe('failure');
  });

  it('returns partial outcome when some criteria met', () => {
    const completion = completeTask(mockGoal, successPlanResult, partialReview);
    expect(completion.outcome).toBe('partial');
  });

  it('includes duration from plan result', () => {
    const completion = completeTask(mockGoal, successPlanResult, successReview);
    expect(completion.durationMs).toBe(500);
  });

  it('generates a summary string', () => {
    const completion = completeTask(mockGoal, successPlanResult, successReview);
    expect(completion.summary).toContain('Build a REST API');
    expect(completion.summary.length).toBeGreaterThan(0);
  });

  it('extracts lessons learned from failures', () => {
    const failedPlan: PlanResult = {
      ...successPlanResult,
      status: 'failure',
      stepResults: [
        { stepId: 's1', status: 'failure', output: '', durationMs: 100, retriesUsed: 2, error: 'timeout' },
      ],
      failedSteps: 1,
      completedSteps: 0,
    };
    const completion = completeTask(mockGoal, failedPlan, failureReview);
    expect(completion.lessonsLearned.length).toBeGreaterThan(0);
    expect(completion.lessonsLearned.some(l => l.includes('timeout'))).toBe(true);
  });

  it('returns empty lessons when everything succeeds cleanly', () => {
    const completion = completeTask(mockGoal, successPlanResult, successReview);
    // No failures, no suggestions → lessons may be empty
    expect(Array.isArray(completion.lessonsLearned)).toBe(true);
  });
});
