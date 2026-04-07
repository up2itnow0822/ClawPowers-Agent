/**
 * ClawPowers Agent — Task Completion
 * Finalizes task execution with outcome determination and summary generation.
 */

import type { Goal, PlanResult, ReviewResult, TaskCompletion, TaskOutcome } from 'clawpowers';

/**
 * Determine the outcome based on review results.
 * - All criteria met → success
 * - Some criteria met → partial
 * - No criteria met → failure
 */
function determineOutcome(reviewResult: ReviewResult): TaskOutcome {
  if (reviewResult.criteria.length === 0) {
    return reviewResult.passed ? 'success' : 'failure';
  }

  const metCount = reviewResult.criteria.filter(c => c.met).length;

  if (metCount === reviewResult.criteria.length) {
    return 'success';
  }
  if (metCount === 0) {
    return 'failure';
  }
  return 'partial';
}

/**
 * Generate a human-readable summary of the task execution.
 */
function generateSummary(
  goal: Goal,
  planResult: PlanResult,
  reviewResult: ReviewResult,
  outcome: TaskOutcome
): string {
  const parts: string[] = [];

  switch (outcome) {
    case 'success':
      parts.push(`Task completed successfully: "${goal.description.slice(0, 100)}"`);
      break;
    case 'partial':
      parts.push(`Task partially completed: "${goal.description.slice(0, 100)}"`);
      break;
    case 'failure':
      parts.push(`Task failed: "${goal.description.slice(0, 100)}"`);
      break;
  }

  parts.push(
    `${planResult.completedSteps}/${planResult.completedSteps + planResult.failedSteps + planResult.skippedSteps} steps completed`
  );

  if (reviewResult.criteria.length > 0) {
    const metCount = reviewResult.criteria.filter(c => c.met).length;
    parts.push(`${metCount}/${reviewResult.criteria.length} criteria met`);
  }

  parts.push(`Duration: ${planResult.durationMs}ms`);

  return parts.join('. ') + '.';
}

/**
 * Extract lessons learned from the execution.
 */
function extractLessons(
  planResult: PlanResult,
  reviewResult: ReviewResult
): string[] {
  const lessons: string[] = [];

  // Learn from failures
  const failedSteps = planResult.stepResults.filter(r => r.status === 'failure');
  for (const step of failedSteps) {
    if (step.error) {
      lessons.push(`Step ${step.stepId.slice(0, 8)} failed: ${step.error}`);
    }
    if (step.retriesUsed > 0) {
      lessons.push(
        `Step ${step.stepId.slice(0, 8)} required ${step.retriesUsed} retries before ${step.status}`
      );
    }
  }

  // Learn from suggestions
  for (const suggestion of reviewResult.suggestions) {
    lessons.push(suggestion);
  }

  return lessons;
}

/**
 * Collect all unique skills referenced in step outputs.
 * Parses the "[skills: ...]" notation from executor output.
 */
function collectSkillsUsed(planResult: PlanResult): string[] {
  const skills = new Set<string>();

  for (const result of planResult.stepResults) {
    if (result.status === 'success') {
      // Parse skills from executor output format: [skills: name1, name2]
      const match = result.output.match(/\[skills:\s*([^\]]+)\]/);
      if (match?.[1]) {
        const names = match[1].split(',').map(s => s.trim()).filter(Boolean);
        for (const name of names) {
          if (name !== 'none') {
            skills.add(name);
          }
        }
      }
    }
  }

  return [...skills];
}

/**
 * Complete a task, producing a final TaskCompletion record.
 */
export function completeTask(
  goal: Goal,
  planResult: PlanResult,
  reviewResult: ReviewResult
): TaskCompletion {
  const outcome = determineOutcome(reviewResult);
  const summary = generateSummary(goal, planResult, reviewResult, outcome);
  const lessonsLearned = extractLessons(planResult, reviewResult);
  const skillsUsed = collectSkillsUsed(planResult);

  return {
    taskId: goal.taskId,
    outcome,
    summary,
    durationMs: planResult.durationMs,
    skillsUsed,
    lessonsLearned,
  };
}
