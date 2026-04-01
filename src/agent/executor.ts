/**
 * ClawPowers Agent — Step Executor
 * Runs plan steps with retry logic, parallel execution, and dependency tracking.
 */

import type {
  Step,
  Plan,
  WorkingMemory,
  StepResult,
  PlanResult,
} from '../types.js';

/**
 * Wait for a specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay for retry attempts.
 * Base delay of 1000ms, doubled each retry: 1s, 2s, 4s, ...
 */
function getBackoffMs(retryCount: number): number {
  return 1000 * Math.pow(2, retryCount);
}

/**
 * Execute a single step. The step's assignedSkills and description
 * drive what work is performed. In a real runtime, this would invoke
 * OpenClaw skills; here we simulate execution based on step state.
 *
 * @param step - The step to execute
 * @param context - Working memory providing task context
 * @param stepRunner - Optional custom step execution function
 */
export async function executeStep(
  step: Step,
  context: WorkingMemory,
  stepRunner?: (step: Step, context: WorkingMemory) => Promise<{ success: boolean; output: string }>
): Promise<StepResult> {
  const startTime = Date.now();
  let lastError: string | null = null;
  let retriesUsed = 0;

  const runner = stepRunner ?? defaultStepRunner;

  for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
    if (attempt > 0) {
      retriesUsed = attempt;
      const backoff = getBackoffMs(attempt - 1);
      await delay(backoff);
    }

    try {
      const result = await runner(step, context);
      if (result.success) {
        return {
          stepId: step.stepId,
          status: 'success',
          output: result.output,
          durationMs: Date.now() - startTime,
          retriesUsed,
          error: null,
        };
      }
      lastError = result.output || 'Step execution failed';
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    stepId: step.stepId,
    status: 'failure',
    output: '',
    durationMs: Date.now() - startTime,
    retriesUsed,
    error: lastError,
  };
}

/**
 * Default step runner — executes the step based on its description and skills.
 * In a full runtime, this would dispatch to OpenClaw skills.
 */
async function defaultStepRunner(
  step: Step,
  _context: WorkingMemory
): Promise<{ success: boolean; output: string }> {
  // Real implementation: dispatch to skill execution engine
  // For now, execute based on step readiness
  if (step.status === 'failed') {
    return { success: false, output: `Step "${step.description}" previously failed` };
  }

  return {
    success: true,
    output: `Completed: ${step.description} [skills: ${step.assignedSkills.join(', ') || 'none'}]`,
  };
}

/**
 * Determine which steps are ready to execute (all dependencies satisfied).
 */
function getReadySteps(
  steps: readonly Step[],
  completedStepIds: ReadonlySet<string>
): Step[] {
  return steps.filter(step => {
    if (step.status !== 'pending') return false;
    return step.dependsOn.every(depId => completedStepIds.has(depId));
  });
}

/**
 * Execute an entire plan, respecting step dependencies.
 * Steps with no unmet dependencies can run concurrently.
 *
 * @param plan - The plan to execute (must be in 'approved' or 'executing' status)
 * @param memory - Working memory for the task
 * @param stepRunner - Optional custom step execution function
 */
export async function executePlan(
  plan: Plan,
  memory: WorkingMemory,
  stepRunner?: (step: Step, context: WorkingMemory) => Promise<{ success: boolean; output: string }>
): Promise<PlanResult> {
  if (plan.status !== 'approved' && plan.status !== 'executing') {
    throw new Error(
      `Cannot execute plan in status "${plan.status}". Plan must be "approved" or "executing".`
    );
  }

  const startTime = Date.now();
  const completedStepIds = new Set<string>();
  const failedStepIds = new Set<string>();
  const stepResults: StepResult[] = [];
  let currentMemory = memory;

  // Build a mutable copy of steps for status tracking
  const mutableSteps = plan.steps.map(s => ({ ...s }));

  while (true) {
    const readySteps = getReadySteps(mutableSteps, completedStepIds);

    if (readySteps.length === 0) {
      // No more steps to run — check if we're done or blocked
      const pendingSteps = mutableSteps.filter(
        s => s.status === 'pending' && !completedStepIds.has(s.stepId) && !failedStepIds.has(s.stepId)
      );
      if (pendingSteps.length === 0) break;

      // Remaining steps are blocked by failed dependencies
      for (const blocked of pendingSteps) {
        stepResults.push({
          stepId: blocked.stepId,
          status: 'failure',
          output: '',
          durationMs: 0,
          retriesUsed: 0,
          error: 'Blocked by failed dependency',
        });
        failedStepIds.add(blocked.stepId);
      }
      break;
    }

    // Execute ready steps concurrently
    const execPromises = readySteps.map(async step => {
      const idx = mutableSteps.findIndex(s => s.stepId === step.stepId);
      if (idx !== -1) {
        mutableSteps[idx] = { ...mutableSteps[idx]!, status: 'in-progress' };
      }
      return executeStep(step, currentMemory, stepRunner);
    });

    const results = await Promise.all(execPromises);

    for (const result of results) {
      stepResults.push(result);

      if (result.status === 'success') {
        completedStepIds.add(result.stepId);
        const idx = mutableSteps.findIndex(s => s.stepId === result.stepId);
        if (idx !== -1) {
          mutableSteps[idx] = { ...mutableSteps[idx]!, status: 'complete' };
        }
        // Update working memory with intermediate output
        currentMemory = {
          ...currentMemory,
          intermediateOutputs: {
            ...currentMemory.intermediateOutputs,
            [result.stepId]: result.output,
          },
          currentStepId: result.stepId,
        };
      } else {
        failedStepIds.add(result.stepId);
        const idx = mutableSteps.findIndex(s => s.stepId === result.stepId);
        if (idx !== -1) {
          mutableSteps[idx] = { ...mutableSteps[idx]!, status: 'failed' };
        }
      }
    }
  }

  const completedCount = stepResults.filter(r => r.status === 'success').length;
  const failedCount = stepResults.filter(r => r.status === 'failure').length;
  const skippedCount = plan.steps.length - stepResults.length;

  let status: 'success' | 'failure' | 'partial';
  if (failedCount === 0 && completedCount === plan.steps.length) {
    status = 'success';
  } else if (completedCount === 0) {
    status = 'failure';
  } else {
    status = 'partial';
  }

  return {
    taskId: plan.taskId,
    status,
    stepResults,
    durationMs: Date.now() - startTime,
    completedSteps: completedCount,
    failedSteps: failedCount,
    skippedSteps: skippedCount,
  };
}
