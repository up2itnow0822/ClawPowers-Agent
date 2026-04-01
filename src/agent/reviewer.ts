/**
 * ClawPowers Agent — Reviewer
 * Post-execution review gate that validates output against success criteria.
 */

import type {
  Goal,
  PlanResult,
  ReviewResult,
  CriterionResult,
  StepResult,
} from '../types.js';

/**
 * Check if a single criterion is met based on step results.
 * Uses keyword matching between criterion text and step outputs/statuses.
 */
function evaluateCriterion(
  criterion: string,
  planResult: PlanResult
): CriterionResult {
  const lower = criterion.toLowerCase();
  const successfulOutputs = planResult.stepResults
    .filter((r): r is StepResult & { status: 'success' } => r.status === 'success')
    .map(r => r.output.toLowerCase());

  const allOutputText = successfulOutputs.join(' ');

  // Check for explicit test-related criteria
  if (lower.includes('tests pass') || lower.includes('test pass')) {
    const met = allOutputText.includes('test') && planResult.status !== 'failure';
    return {
      criterion,
      met,
      evidence: met
        ? `Tests referenced in successful step outputs`
        : `No evidence of passing tests in step outputs`,
    };
  }

  // Check for compilation criteria
  if (lower.includes('compiles') || lower.includes('compile') || lower.includes('build')) {
    const met = allOutputText.includes('compil') || allOutputText.includes('build') || planResult.status === 'success';
    return {
      criterion,
      met,
      evidence: met
        ? `Build/compilation completed successfully`
        : `No evidence of successful compilation`,
    };
  }

  // Check if the criterion text overlaps with any step output
  const criterionWords = lower.split(/\s+/).filter(w => w.length > 3);
  const matchCount = criterionWords.filter(w => allOutputText.includes(w)).length;
  const matchRatio = criterionWords.length > 0 ? matchCount / criterionWords.length : 0;

  // If plan succeeded and we have some keyword overlap, consider it met
  const met = planResult.status === 'success' || (planResult.status === 'partial' && matchRatio > 0.5);

  let evidence: string;
  if (met) {
    evidence = planResult.status === 'success'
      ? `All ${planResult.completedSteps} steps completed successfully`
      : `${planResult.completedSteps}/${planResult.completedSteps + planResult.failedSteps} steps completed with relevant output`;
  } else {
    const failedSteps = planResult.stepResults.filter(r => r.status === 'failure');
    const errors = failedSteps.map(r => r.error ?? 'unknown error').join('; ');
    evidence = `Step failures prevented criterion satisfaction: ${errors || 'unknown'}`;
  }

  return { criterion, met, evidence };
}

/**
 * Generate improvement suggestions based on review results.
 */
function generateSuggestions(
  criteria: readonly CriterionResult[],
  planResult: PlanResult
): string[] {
  const suggestions: string[] = [];
  const failedCriteria = criteria.filter(c => !c.met);

  if (failedCriteria.length > 0) {
    suggestions.push(
      `${failedCriteria.length} criterion/criteria not met. Consider breaking the task into smaller sub-tasks.`
    );
  }

  const failedSteps = planResult.stepResults.filter(r => r.status === 'failure');
  if (failedSteps.length > 0) {
    for (const step of failedSteps) {
      if (step.retriesUsed > 0) {
        suggestions.push(
          `Step ${step.stepId.slice(0, 8)} failed after ${step.retriesUsed} retries: ${step.error ?? 'unknown error'}`
        );
      }
    }
  }

  if (planResult.status === 'partial') {
    suggestions.push(
      'Partial completion achieved. Review failed steps and consider alternative approaches.'
    );
  }

  return suggestions;
}

/**
 * Review the output of a plan execution against the goal's success criteria.
 * Returns a ReviewResult indicating whether all criteria are met.
 */
export function reviewOutput(
  goal: Goal,
  planResult: PlanResult
): ReviewResult {
  if (goal.successCriteria.length === 0) {
    // No explicit criteria — pass if plan succeeded
    return {
      passed: planResult.status === 'success',
      criteria: [],
      suggestions: planResult.status === 'success'
        ? []
        : ['No success criteria defined. Plan execution did not fully succeed.'],
    };
  }

  const criteria = goal.successCriteria.map(c => evaluateCriterion(c, planResult));
  const allMet = criteria.every(c => c.met);
  const suggestions = generateSuggestions(criteria, planResult);

  return {
    passed: allMet,
    criteria,
    suggestions,
  };
}
