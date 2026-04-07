/**
 * ClawPowers Agent — Planner
 * Decomposes Goals into executable Plans with dependency-ordered Steps.
 */

import { randomUUID } from 'node:crypto';
import type { Goal, Plan, Step, SkillManifest } from 'clawpowers';

/**
 * Match skills to a step description based on keyword overlap.
 * Returns skill names sorted by relevance (number of matching words).
 */
function matchSkills(
  stepDescription: string,
  skills: readonly SkillManifest[]
): string[] {
  const descWords = new Set(
    stepDescription.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  );

  const scored = skills
    .map(skill => {
      const skillWords = `${skill.name} ${skill.description}`.toLowerCase().split(/\s+/);
      const overlap = skillWords.filter(w => descWords.has(w)).length;
      return { name: skill.name, score: overlap };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(s => s.name);
}

/**
 * Break a goal description into logical step descriptions.
 * Uses heuristics: sentence splitting, bullet points, numbered lists.
 */
function decomposeGoal(goal: Goal): string[] {
  const text = goal.description;
  const steps: string[] = [];

  // Check for numbered list items: "1. ...", "2. ..."
  const numberedPattern = /^\s*\d+[.)]\s+(.+)$/gm;
  let numberedMatch: RegExpExecArray | null;
  while ((numberedMatch = numberedPattern.exec(text)) !== null) {
    if (numberedMatch[1]) {
      steps.push(numberedMatch[1].trim());
    }
  }

  if (steps.length > 0) {
    return steps;
  }

  // Check for bullet points: "- ...", "* ..."
  const bulletPattern = /^\s*[-*]\s+(.+)$/gm;
  let bulletMatch: RegExpExecArray | null;
  while ((bulletMatch = bulletPattern.exec(text)) !== null) {
    if (bulletMatch[1]) {
      steps.push(bulletMatch[1].trim());
    }
  }

  if (steps.length > 0) {
    return steps;
  }

  // Check for "then" / "and then" / "after that" sequential connectors
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length > 1) {
    return sentences;
  }

  // Single sentence — return as one step
  return [text.trim()];
}

/**
 * Create a Plan from a Goal and available skills.
 * Steps are ordered sequentially by default; each step depends on the previous one
 * unless the goal structure suggests parallelism.
 */
export function createPlan(
  goal: Goal,
  skills: readonly SkillManifest[]
): Plan {
  const stepDescriptions = decomposeGoal(goal);
  const steps: Step[] = [];

  for (let i = 0; i < stepDescriptions.length; i++) {
    const desc = stepDescriptions[i]!;
    const assignedSkills = matchSkills(desc, skills);

    // Sequential dependency: each step depends on the previous
    const dependsOn: string[] = [];
    if (i > 0) {
      const prevStep = steps[i - 1];
      if (prevStep) {
        dependsOn.push(prevStep.stepId);
      }
    }

    steps.push({
      stepId: randomUUID(),
      description: desc,
      assignedSkills,
      status: 'pending',
      dependsOn,
      output: null,
      retryCount: 0,
      maxRetries: 3,
    });
  }

  return {
    taskId: goal.taskId,
    steps,
    status: 'draft',
    createdAt: new Date().toISOString(),
    approvedAt: null,
    parallelizable: false,
  };
}

/**
 * Transition a plan from 'draft' to 'approved'.
 * @throws {Error} If plan is not in 'draft' status
 */
export function approvePlan(plan: Plan): Plan {
  if (plan.status !== 'draft') {
    throw new Error(
      `Cannot approve plan in status "${plan.status}". Plan must be in "draft" status.`
    );
  }

  return {
    ...plan,
    status: 'approved',
    approvedAt: new Date().toISOString(),
  };
}

/**
 * Validate plan dependencies: check for cycles and missing dependency references.
 * Returns true if the dependency graph is valid (no cycles, all deps exist).
 */
export function validatePlanDependencies(plan: Plan): boolean {
  const stepIds = new Set(plan.steps.map(s => s.stepId));

  // Check all dependsOn references exist
  for (const step of plan.steps) {
    for (const depId of step.dependsOn) {
      if (!stepIds.has(depId)) {
        return false; // Missing dependency
      }
    }
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const depsMap = new Map<string, readonly string[]>();
  for (const step of plan.steps) {
    depsMap.set(step.stepId, step.dependsOn);
  }

  function hasCycle(stepId: string): boolean {
    visited.add(stepId);
    recursionStack.add(stepId);

    const deps = depsMap.get(stepId) ?? [];
    for (const depId of deps) {
      if (!visited.has(depId)) {
        if (hasCycle(depId)) return true;
      } else if (recursionStack.has(depId)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(stepId);
    return false;
  }

  for (const step of plan.steps) {
    if (!visited.has(step.stepId)) {
      if (hasCycle(step.stepId)) {
        return false;
      }
    }
  }

  return true;
}
