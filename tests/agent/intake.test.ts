import { describe, it, expect } from 'vitest';
import { parseTask } from '../../src/agent/intake.js';

describe('parseTask', () => {
  it('parses a simple task into a Goal', () => {
    const goal = parseTask('Build a REST API');
    expect(goal.description).toBe('Build a REST API');
    expect(goal.taskId).toMatch(/^[0-9a-f-]{36}$/);
    expect(goal.source).toBe('cli');
    expect(goal.createdAt).toBeTruthy();
  });

  it('rejects empty tasks', () => {
    expect(() => parseTask('')).toThrow('Task cannot be empty');
  });

  it('rejects whitespace-only tasks', () => {
    expect(() => parseTask('   \n\t  ')).toThrow('Task cannot be empty');
  });

  it('rejects tasks exceeding max length', () => {
    const longTask = 'a'.repeat(10_001);
    expect(() => parseTask(longTask)).toThrow('exceeds maximum length');
  });

  it('accepts tasks at the max length boundary', () => {
    const task = 'a'.repeat(10_000);
    const goal = parseTask(task);
    expect(goal.description.length).toBe(10_000);
  });

  it('extracts constraints from task text', () => {
    const goal = parseTask('Build an API. Must use TypeScript. No external databases. Using Express framework.');
    expect(goal.constraints).toContain('Must use TypeScript');
    expect(goal.constraints).toContain('No external databases');
    expect(goal.constraints).toContain('Using Express framework');
  });

  it('extracts success criteria from task text', () => {
    const goal = parseTask('Create a function that returns the sum. Tests pass. It should handle negative numbers.');
    expect(goal.successCriteria.length).toBeGreaterThanOrEqual(1);
    const criteriaText = goal.successCriteria.join(' ');
    expect(criteriaText.toLowerCase()).toContain('tests pass');
  });

  it('sets the source field correctly', () => {
    const goal = parseTask('Do something', 'interactive');
    expect(goal.source).toBe('interactive');
  });

  it('generates unique taskIds', () => {
    const goal1 = parseTask('Task 1');
    const goal2 = parseTask('Task 2');
    expect(goal1.taskId).not.toBe(goal2.taskId);
  });

  it('trims whitespace from task', () => {
    const goal = parseTask('  Build something  ');
    expect(goal.description).toBe('Build something');
  });

  it('provides default success criteria when none found', () => {
    const goal = parseTask('Do it');
    expect(goal.successCriteria.length).toBeGreaterThan(0);
    expect(goal.successCriteria[0]).toContain('Task completed');
  });
});
