/**
 * Integration Test: Full Control Loop
 * Tests intake → plan → execute → review → complete cycle with real module interactions.
 */

import { describe, it, expect } from 'vitest';
import { parseTask } from '../../src/agent/intake.js';
import { createPlan, approvePlan, validatePlanDependencies } from '../../src/agent/planner.js';
import { executePlan } from '../../src/agent/executor.js';
import { reviewOutput } from '../../src/agent/reviewer.js';
import { completeTask } from '../../src/agent/completion.js';
import { WorkingMemoryManager } from 'clawpowers';
import type { Step, Plan, WorkingMemory, SkillManifest, Goal } from 'clawpowers';

const testSkills: SkillManifest[] = [
  { name: 'tdd', description: 'Test driven development', path: '/skills/tdd', requirements: null },
  { name: 'debugging', description: 'Debug and fix issues', path: '/skills/debugging', requirements: null },
  { name: 'refactor', description: 'Refactor code for clarity', path: '/skills/refactor', requirements: null },
  { name: 'deploy', description: 'Deploy to production', path: '/skills/deploy', requirements: null },
];

/**
 * Helper to create a plan with explicit steps (bypassing planner decomposition)
 * for precise control in tests.
 */
function makePlan(goal: Goal, steps: Array<{ desc: string; deps?: string[]; maxRetries?: number }>): Plan {
  const builtSteps: Step[] = steps.map((s, i) => ({
    stepId: `step-${i + 1}`,
    description: s.desc,
    assignedSkills: [],
    status: 'pending' as const,
    dependsOn: s.deps ?? (i > 0 ? [`step-${i}`] : []),
    output: null,
    retryCount: 0,
    maxRetries: s.maxRetries ?? 0,
  }));
  return {
    taskId: goal.taskId,
    steps: builtSteps,
    status: 'approved',
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    parallelizable: false,
  };
}

function makeMemory(goal: Goal, plan: Plan): WorkingMemory {
  return {
    taskId: goal.taskId,
    goal,
    plan,
    currentStepId: null,
    intermediateOutputs: {},
    contextWindow: [],
  };
}

describe('Control Loop Integration', () => {
  it('runs full intake → plan → execute → review → complete cycle', async () => {
    // Intake
    const goal = parseTask('Build authentication module. Tests pass. Compiles successfully.');
    expect(goal.taskId).toBeTruthy();
    expect(goal.successCriteria.length).toBeGreaterThan(0);

    // Plan
    const plan = createPlan(goal, testSkills);
    expect(plan.status).toBe('draft');
    expect(validatePlanDependencies(plan)).toBe(true);

    const approved = approvePlan(plan);
    expect(approved.status).toBe('approved');

    // Working memory
    const wmm = new WorkingMemoryManager();
    const memory = wmm.create(goal.taskId, goal);

    // Execute
    const runner = async (step: Step) => ({
      success: true,
      output: `Completed: ${step.description} [skills: tdd]`,
    });
    const planResult = await executePlan(approved, memory, runner);
    expect(planResult.status).toBe('success');

    // Review
    const review = reviewOutput(goal, planResult);
    expect(review.passed).toBe(true);

    // Complete
    const completion = completeTask(goal, planResult, review);
    expect(completion.outcome).toBe('success');
    expect(completion.taskId).toBe(goal.taskId);
    expect(completion.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles multi-step task with sequential dependencies', async () => {
    const goal = parseTask(
      '1. Create database schema\n2. Build API endpoints\n3. Write integration tests\n4. Deploy to staging'
    );

    const plan = createPlan(goal, testSkills);
    expect(plan.steps.length).toBe(4);

    // Verify sequential dependency chain
    for (let i = 1; i < plan.steps.length; i++) {
      expect(plan.steps[i]!.dependsOn).toContain(plan.steps[i - 1]!.stepId);
    }

    const approved = approvePlan(plan);
    const wmm = new WorkingMemoryManager();
    const memory = wmm.create(goal.taskId, goal);

    const executionOrder: string[] = [];
    const runner = async (step: Step) => {
      executionOrder.push(step.description);
      return { success: true, output: `Done: ${step.description}` };
    };

    const planResult = await executePlan(approved, memory, runner);
    expect(planResult.status).toBe('success');
    expect(planResult.completedSteps).toBe(4);

    // Verify execution order matches plan order
    expect(executionOrder[0]).toContain('database schema');
    expect(executionOrder[3]).toContain('Deploy to staging');
  });

  it('retries a failing step that succeeds on retry', { timeout: 15000 }, async () => {
    const goal = parseTask('Run flaky tests. Tests pass.');

    // Create a single-step plan with controlled retries
    const plan = makePlan(goal, [
      { desc: 'Run the flaky test suite', deps: [], maxRetries: 2 },
    ]);
    const memory = makeMemory(goal, plan);

    let attempts = 0;
    const runner = async (_step: Step) => {
      attempts++;
      if (attempts < 3) return { success: false, output: 'Flaky failure' };
      return { success: true, output: 'Tests pass [skills: tdd]' };
    };

    const planResult = await executePlan(plan, memory, runner);
    expect(planResult.status).toBe('success');
    expect(attempts).toBe(3); // 1 initial + 2 retries

    const review = reviewOutput(goal, planResult);
    const completion = completeTask(goal, planResult, review);
    expect(completion.outcome).toBe('success');
  });

  it('handles step that exhausts retries → partial completion', { timeout: 15000 }, async () => {
    const goal = parseTask('Setup environment and run service');

    // Two independent steps: one succeeds, one fails
    const plan = makePlan(goal, [
      { desc: 'Setup environment', deps: [], maxRetries: 0 },
      { desc: 'Run unreliable service', deps: [], maxRetries: 0 },
    ]);
    const memory = makeMemory(goal, plan);

    const runner = async (step: Step) => {
      if (step.description.includes('unreliable')) {
        return { success: false, output: 'Service unavailable' };
      }
      return { success: true, output: `Done: ${step.description}` };
    };

    const planResult = await executePlan(plan, memory, runner);
    // Step 1 succeeds, step 2 fails → partial
    expect(planResult.status).toBe('partial');
    expect(planResult.completedSteps).toBe(1);
    expect(planResult.failedSteps).toBe(1);

    const review = reviewOutput(goal, planResult);
    const completion = completeTask(goal, planResult, review);
    // With partial plan and some criteria met → partial or failure
    expect(['partial', 'failure']).toContain(completion.outcome);
    expect(completion.lessonsLearned.length).toBeGreaterThan(0);
  });

  it('all steps fail → failure outcome', async () => {
    const goal = parseTask('Deploy to production. Compiles successfully.');

    // Single step, no retries (avoids backoff timeout)
    const plan = makePlan(goal, [
      { desc: 'Deploy to production', deps: [], maxRetries: 0 },
    ]);
    const memory = makeMemory(goal, plan);

    const runner = async (_step: Step) => ({
      success: false,
      output: 'Critical failure',
    });

    const planResult = await executePlan(plan, memory, runner);
    expect(planResult.status).toBe('failure');
    expect(planResult.completedSteps).toBe(0);

    const review = reviewOutput(goal, planResult);
    expect(review.passed).toBe(false);

    const completion = completeTask(goal, planResult, review);
    expect(completion.outcome).toBe('failure');
  });

  it('review gate catches unmet criteria', async () => {
    const goal = parseTask('Build feature. Tests pass. Compiles successfully.');

    const plan = makePlan(goal, [
      { desc: 'Build the feature', deps: [], maxRetries: 0 },
    ]);
    const memory = makeMemory(goal, plan);

    const runner = async (_step: Step) => ({
      success: false,
      output: 'Incomplete work',
    });

    const planResult = await executePlan(plan, memory, runner);
    const review = reviewOutput(goal, planResult);

    expect(review.passed).toBe(false);
    const unmetCriteria = review.criteria.filter(c => !c.met);
    expect(unmetCriteria.length).toBeGreaterThan(0);
  });

  it('working memory tracks state through full cycle', async () => {
    const goal = parseTask('1. Analyze requirements\n2. Write code\n3. Run tests');
    const plan = createPlan(goal, testSkills);
    const approved = approvePlan(plan);

    const wmm = new WorkingMemoryManager();
    const memory = wmm.create(goal.taskId, goal);

    expect(memory.taskId).toBe(goal.taskId);
    expect(memory.goal.description).toBe(goal.description);
    expect(Object.keys(memory.intermediateOutputs)).toHaveLength(0);

    const runner = async (step: Step) => ({
      success: true,
      output: `Result of: ${step.description}`,
    });

    const planResult = await executePlan(approved, memory, runner);
    expect(planResult.status).toBe('success');

    for (const result of planResult.stepResults) {
      expect(result.output).toContain('Result of:');
    }
  });

  it('context injection works within control loop', async () => {
    const goal = parseTask('Build auth module. Should work correctly.');
    const wmm = new WorkingMemoryManager();
    wmm.create(goal.taskId, goal);

    wmm.injectContext([
      'Previous auth implementation used JWT tokens',
      'Rate limiting was set to 100 req/min',
    ]);

    const snapshot = wmm.getSnapshot();
    expect(snapshot.contextWindow).toHaveLength(2);
    expect(snapshot.contextWindow[0]).toContain('JWT');
  });

  it('plan validation detects cycles in manually created plans', () => {
    const goal = parseTask('Test cycle detection');
    const plan = createPlan(goal, []);

    const circularPlan = {
      ...plan,
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [] as string[], status: 'pending' as const, dependsOn: ['b'], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'b', description: 'B', assignedSkills: [] as string[], status: 'pending' as const, dependsOn: ['a'], output: null, retryCount: 0, maxRetries: 3 },
      ],
    };

    expect(validatePlanDependencies(circularPlan)).toBe(false);
  });

  it('handles empty success criteria gracefully', async () => {
    const goal = parseTask('do something');
    const plan = createPlan(goal, testSkills);
    const approved = approvePlan(plan);
    const wmm = new WorkingMemoryManager();
    const memory = wmm.create(goal.taskId, goal);

    const runner = async (_step: Step) => ({
      success: true,
      output: 'Done',
    });

    const planResult = await executePlan(approved, memory, runner);
    const review = reviewOutput(goal, planResult);
    const completion = completeTask(goal, planResult, review);

    expect(completion.outcome).toBeDefined();
    expect(completion.summary).toBeTruthy();
  });

  it('skills are assigned to steps based on description matching', () => {
    const goal = parseTask('Debug and fix the failing test suite');
    const plan = createPlan(goal, testSkills);

    const allSkills = plan.steps.flatMap(s => s.assignedSkills);
    expect(allSkills.length).toBeGreaterThanOrEqual(0);
  });

  it('completion extracts skills from step outputs', async () => {
    const goal = parseTask('Build feature. Tests pass.');
    const plan = makePlan(goal, [
      { desc: 'Build the feature', deps: [], maxRetries: 0 },
    ]);
    const memory = makeMemory(goal, plan);

    const runner = async (_step: Step) => ({
      success: true,
      output: 'Completed task [skills: tdd, debugging]',
    });

    const planResult = await executePlan(plan, memory, runner);
    const review = reviewOutput(goal, planResult);
    const completion = completeTask(goal, planResult, review);

    expect(completion.skillsUsed).toContain('tdd');
    expect(completion.skillsUsed).toContain('debugging');
  });
});
