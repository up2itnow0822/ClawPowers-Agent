import { describe, it, expect } from 'vitest';
import { executeStep, executePlan } from '../../src/agent/executor.js';
import type { Step, Plan, WorkingMemory, Goal } from 'clawpowers';

const mockGoal: Goal = {
  taskId: 'exec-test-001',
  description: 'Test execution',
  constraints: [],
  successCriteria: [],
  createdAt: '2026-03-28T00:00:00Z',
  source: 'cli',
};

const mockPlan: Plan = {
  taskId: 'exec-test-001',
  steps: [
    { stepId: 'step-1', description: 'Step 1', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 0 },
    { stepId: 'step-2', description: 'Step 2', assignedSkills: [], status: 'pending', dependsOn: ['step-1'], output: null, retryCount: 0, maxRetries: 0 },
    { stepId: 'step-3', description: 'Step 3', assignedSkills: [], status: 'pending', dependsOn: ['step-2'], output: null, retryCount: 0, maxRetries: 0 },
  ],
  status: 'approved',
  createdAt: '2026-03-28T00:00:00Z',
  approvedAt: '2026-03-28T00:00:01Z',
  parallelizable: false,
};

function createWorkingMemory(plan: Plan): WorkingMemory {
  return {
    taskId: plan.taskId,
    goal: mockGoal,
    plan,
    currentStepId: null,
    intermediateOutputs: {},
    contextWindow: [],
  };
}

describe('executeStep', () => {
  it('executes a step successfully with default runner', async () => {
    const step: Step = mockPlan.steps[0]!;
    const memory = createWorkingMemory(mockPlan);
    const result = await executeStep(step, memory);
    expect(result.status).toBe('success');
    expect(result.stepId).toBe('step-1');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeNull();
  });

  it('executes a step with a custom runner', async () => {
    const step: Step = mockPlan.steps[0]!;
    const memory = createWorkingMemory(mockPlan);
    const runner = async () => ({ success: true, output: 'custom output' });
    const result = await executeStep(step, memory, runner);
    expect(result.status).toBe('success');
    expect(result.output).toBe('custom output');
  });

  it('retries on failure up to maxRetries', { timeout: 15000 }, async () => {
    const step: Step = { ...mockPlan.steps[0]!, maxRetries: 2 };
    const memory = createWorkingMemory(mockPlan);
    let attempts = 0;
    const runner = async () => {
      attempts++;
      return { success: false, output: 'failed' };
    };
    const result = await executeStep(step, memory, runner);
    expect(result.status).toBe('failure');
    expect(attempts).toBe(3); // 1 initial + 2 retries
    expect(result.retriesUsed).toBe(2);
  });

  it('succeeds on retry after initial failure', { timeout: 15000 }, async () => {
    const step: Step = { ...mockPlan.steps[0]!, maxRetries: 3 };
    const memory = createWorkingMemory(mockPlan);
    let attempts = 0;
    const runner = async () => {
      attempts++;
      if (attempts < 3) return { success: false, output: 'not yet' };
      return { success: true, output: 'worked on retry' };
    };
    const result = await executeStep(step, memory, runner);
    expect(result.status).toBe('success');
    expect(result.retriesUsed).toBe(2);
    expect(result.output).toBe('worked on retry');
  });

  it('handles thrown exceptions in runner', async () => {
    const step: Step = { ...mockPlan.steps[0]!, maxRetries: 0 };
    const memory = createWorkingMemory(mockPlan);
    const runner = async () => { throw new Error('runtime error'); };
    const result = await executeStep(step, memory, runner);
    expect(result.status).toBe('failure');
    expect(result.error).toBe('runtime error');
  });
});

describe('executePlan', () => {
  it('executes all steps in order when all succeed', async () => {
    const memory = createWorkingMemory(mockPlan);
    const executionOrder: string[] = [];
    const runner = async (step: Step) => {
      executionOrder.push(step.stepId);
      return { success: true, output: `done: ${step.stepId}` };
    };
    const result = await executePlan(mockPlan, memory, runner);
    expect(result.status).toBe('success');
    expect(result.completedSteps).toBe(3);
    expect(result.failedSteps).toBe(0);
    expect(executionOrder).toEqual(['step-1', 'step-2', 'step-3']);
  });

  it('handles step failure and marks dependents as failed', async () => {
    const memory = createWorkingMemory(mockPlan);
    const runner = async (step: Step) => {
      if (step.stepId === 'step-1') return { success: false, output: 'fail' };
      return { success: true, output: 'ok' };
    };
    const result = await executePlan(mockPlan, memory, runner);
    expect(result.status).toBe('failure');
    expect(result.failedSteps).toBe(3); // step-1 fails, step-2 and step-3 blocked
  });

  it('executes parallel steps concurrently when no dependencies', async () => {
    const parallelPlan: Plan = {
      taskId: 'parallel-test',
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'b', description: 'B', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'c', description: 'C', assignedSkills: [], status: 'pending', dependsOn: ['a', 'b'], output: null, retryCount: 0, maxRetries: 3 },
      ],
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: '2026-01-01T00:00:01Z',
      parallelizable: true,
    };
    const memory = createWorkingMemory(parallelPlan);
    const executionBatches: string[][] = [];
    let currentBatch: string[] = [];
    let batchResolvers: Array<() => void> = [];

    const runner = async (step: Step) => {
      currentBatch.push(step.stepId);
      return { success: true, output: `done: ${step.stepId}` };
    };

    const result = await executePlan(parallelPlan, memory, runner);
    expect(result.status).toBe('success');
    expect(result.completedSteps).toBe(3);
  });

  it('throws when executing a non-approved plan', async () => {
    const draftPlan: Plan = { ...mockPlan, status: 'draft' };
    const memory = createWorkingMemory(draftPlan);
    await expect(executePlan(draftPlan, memory)).rejects.toThrow('Cannot execute plan');
  });

  it('returns partial when some steps succeed and some fail', async () => {
    const plan: Plan = {
      taskId: 'partial-test',
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 0 },
        { stepId: 'b', description: 'B', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 0 },
      ],
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: '2026-01-01T00:00:01Z',
      parallelizable: true,
    };
    const memory = createWorkingMemory(plan);
    const runner = async (step: Step) => {
      if (step.stepId === 'a') return { success: true, output: 'ok' };
      return { success: false, output: 'fail' };
    };
    const result = await executePlan(plan, memory, runner);
    expect(result.status).toBe('partial');
    expect(result.completedSteps).toBe(1);
    expect(result.failedSteps).toBe(1);
  });

  it('tracks duration across plan execution', async () => {
    const memory = createWorkingMemory(mockPlan);
    const runner = async () => ({ success: true, output: 'ok' });
    const result = await executePlan(mockPlan, memory, runner);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
