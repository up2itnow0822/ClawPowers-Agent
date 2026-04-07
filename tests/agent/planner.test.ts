import { describe, it, expect } from 'vitest';
import { createPlan, approvePlan, validatePlanDependencies } from '../../src/agent/planner.js';
import type { Goal, Plan, Step, SkillManifest } from 'clawpowers';

const mockGoal: Goal = {
  taskId: 'test-task-001',
  description: 'Build a REST API with authentication',
  constraints: ['Must use TypeScript'],
  successCriteria: ['Tests pass'],
  createdAt: '2026-03-28T00:00:00Z',
  source: 'cli',
};

const mockSkills: SkillManifest[] = [
  { name: 'tdd', description: 'Test-driven development', path: '/skills/tdd', requirements: null },
  { name: 'debugging', description: 'Systematic debugging', path: '/skills/debugging', requirements: null },
  { name: 'api-builder', description: 'Build REST API endpoints', path: '/skills/api', requirements: null },
  { name: 'auth', description: 'Authentication and authorization', path: '/skills/auth', requirements: null },
];

describe('createPlan', () => {
  it('creates a plan from a goal', () => {
    const plan = createPlan(mockGoal, mockSkills);
    expect(plan.taskId).toBe('test-task-001');
    expect(plan.status).toBe('draft');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.approvedAt).toBeNull();
  });

  it('assigns skills to steps based on keyword matching', () => {
    const goal: Goal = {
      ...mockGoal,
      description: 'Build REST API endpoints',
    };
    const plan = createPlan(goal, mockSkills);
    const allAssigned = plan.steps.flatMap(s => [...s.assignedSkills]);
    // api-builder should match due to "API" and "endpoints"
    expect(allAssigned.some(s => s === 'api-builder')).toBe(true);
  });

  it('creates sequential dependencies by default', () => {
    const goal: Goal = {
      ...mockGoal,
      description: 'First do A. Then do B. Finally do C.',
    };
    const plan = createPlan(goal, []);
    expect(plan.steps.length).toBe(3);
    expect(plan.steps[0]!.dependsOn).toEqual([]);
    expect(plan.steps[1]!.dependsOn).toEqual([plan.steps[0]!.stepId]);
    expect(plan.steps[2]!.dependsOn).toEqual([plan.steps[1]!.stepId]);
  });

  it('handles numbered list decomposition', () => {
    const goal: Goal = {
      ...mockGoal,
      description: '1. Setup project\n2. Write tests\n3. Implement API',
    };
    const plan = createPlan(goal, []);
    expect(plan.steps.length).toBe(3);
    expect(plan.steps[0]!.description).toBe('Setup project');
    expect(plan.steps[1]!.description).toBe('Write tests');
    expect(plan.steps[2]!.description).toBe('Implement API');
  });

  it('handles bullet list decomposition', () => {
    const goal: Goal = {
      ...mockGoal,
      description: '- Create models\n- Add routes\n- Write tests',
    };
    const plan = createPlan(goal, []);
    expect(plan.steps.length).toBe(3);
  });

  it('sets default maxRetries of 3 on each step', () => {
    const plan = createPlan(mockGoal, []);
    for (const step of plan.steps) {
      expect(step.maxRetries).toBe(3);
    }
  });

  it('sets all steps to pending status', () => {
    const plan = createPlan(mockGoal, []);
    for (const step of plan.steps) {
      expect(step.status).toBe('pending');
    }
  });

  it('sets parallelizable to false by default', () => {
    const plan = createPlan(mockGoal, []);
    expect(plan.parallelizable).toBe(false);
  });
});

describe('approvePlan', () => {
  it('transitions plan from draft to approved', () => {
    const plan = createPlan(mockGoal, []);
    const approved = approvePlan(plan);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeTruthy();
  });

  it('throws when approving a non-draft plan', () => {
    const plan = createPlan(mockGoal, []);
    const approved = approvePlan(plan);
    expect(() => approvePlan(approved)).toThrow('Cannot approve plan');
  });
});

describe('validatePlanDependencies', () => {
  it('returns true for a valid dependency chain', () => {
    const plan = createPlan(mockGoal, []);
    expect(validatePlanDependencies(plan)).toBe(true);
  });

  it('returns true for a plan with no dependencies', () => {
    const plan: Plan = {
      taskId: 'test',
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'b', description: 'B', assignedSkills: [], status: 'pending', dependsOn: [], output: null, retryCount: 0, maxRetries: 3 },
      ],
      status: 'draft',
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: null,
      parallelizable: true,
    };
    expect(validatePlanDependencies(plan)).toBe(true);
  });

  it('detects missing dependency references', () => {
    const plan: Plan = {
      taskId: 'test',
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [], status: 'pending', dependsOn: ['nonexistent'], output: null, retryCount: 0, maxRetries: 3 },
      ],
      status: 'draft',
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: null,
      parallelizable: false,
    };
    expect(validatePlanDependencies(plan)).toBe(false);
  });

  it('detects simple cycles (A→B→A)', () => {
    const plan: Plan = {
      taskId: 'test',
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [], status: 'pending', dependsOn: ['b'], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'b', description: 'B', assignedSkills: [], status: 'pending', dependsOn: ['a'], output: null, retryCount: 0, maxRetries: 3 },
      ],
      status: 'draft',
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: null,
      parallelizable: false,
    };
    expect(validatePlanDependencies(plan)).toBe(false);
  });

  it('detects complex cycles (A→B→C→A)', () => {
    const plan: Plan = {
      taskId: 'test',
      steps: [
        { stepId: 'a', description: 'A', assignedSkills: [], status: 'pending', dependsOn: ['c'], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'b', description: 'B', assignedSkills: [], status: 'pending', dependsOn: ['a'], output: null, retryCount: 0, maxRetries: 3 },
        { stepId: 'c', description: 'C', assignedSkills: [], status: 'pending', dependsOn: ['b'], output: null, retryCount: 0, maxRetries: 3 },
      ],
      status: 'draft',
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: null,
      parallelizable: false,
    };
    expect(validatePlanDependencies(plan)).toBe(false);
  });
});
