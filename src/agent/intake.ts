/**
 * ClawPowers Agent — Task Intake
 * Parses natural language tasks into structured Goal objects.
 */

import { randomUUID } from 'node:crypto';
import type { Goal, GoalSource } from '../types.js';

const MAX_TASK_LENGTH = 10_000;

/**
 * Extract constraints from task text.
 * Looks for patterns like "must ...", "no ...", "without ...", "using ...", "only ..."
 */
function extractConstraints(text: string): string[] {
  const constraints: string[] = [];
  const lines = text.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith('must ') ||
      lower.startsWith('no ') ||
      lower.startsWith('without ') ||
      lower.startsWith('using ') ||
      lower.startsWith('only ') ||
      lower.includes('must not ') ||
      lower.includes('should not ') ||
      lower.includes('do not ') ||
      lower.includes('don\'t ')
    ) {
      constraints.push(line);
    }
  }

  return constraints;
}

/**
 * Extract success criteria from task text.
 * Looks for patterns indicating testable outcomes.
 */
function extractSuccessCriteria(text: string): string[] {
  const criteria: string[] = [];
  const lines = text.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('should ') ||
      lower.includes('passes ') ||
      lower.includes('works ') ||
      lower.includes('tests pass') ||
      lower.includes('compiles') ||
      lower.includes('returns ') ||
      lower.includes('outputs ') ||
      lower.includes('produces ') ||
      lower.includes('results in ')
    ) {
      criteria.push(line);
    }
  }

  // If no explicit criteria found, derive a basic one from the task
  if (criteria.length === 0) {
    const description = text.trim().split(/\n/)[0] ?? text.trim();
    criteria.push(`Task completed: ${description.slice(0, 200)}`);
  }

  return criteria;
}

/**
 * Parse a raw task string into a structured Goal.
 *
 * @throws {Error} If task is empty or exceeds maximum length
 */
export function parseTask(
  rawTask: string,
  source: GoalSource = 'cli'
): Goal {
  const trimmed = rawTask.trim();

  if (trimmed.length === 0) {
    throw new Error('Task cannot be empty');
  }

  if (trimmed.length > MAX_TASK_LENGTH) {
    throw new Error(
      `Task exceeds maximum length of ${MAX_TASK_LENGTH} characters (got ${trimmed.length})`
    );
  }

  const constraints = extractConstraints(trimmed);
  const successCriteria = extractSuccessCriteria(trimmed);

  return {
    taskId: randomUUID(),
    description: trimmed,
    constraints,
    successCriteria,
    createdAt: new Date().toISOString(),
    source,
  };
}
