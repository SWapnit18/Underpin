const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

describe('validators', () => {
  // ─── validateCreateTask ────────────────────────────────────

  describe('validateCreateTask', () => {
    it('should return null for valid minimal payload', () => {
      const error = validateCreateTask({ title: 'Buy milk' });
      expect(error).toBeNull();
    });

    it('should return null for valid full payload', () => {
      const error = validateCreateTask({
        title: 'Complete project',
        description: 'Need to write unit tests',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-10-15T00:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    it('should reject missing title', () => {
      const error = validateCreateTask({});
      expect(error).toBe('title is required and must be a non-empty string');
    });

    it('should reject non-string title', () => {
      expect(validateCreateTask({ title: 123 })).toBe(
        'title is required and must be a non-empty string'
      );
      expect(validateCreateTask({ title: true })).toBe(
        'title is required and must be a non-empty string'
      );
      expect(validateCreateTask({ title: {} })).toBe(
        'title is required and must be a non-empty string'
      );
    });

    it('should reject whitespace-only or empty title', () => {
      expect(validateCreateTask({ title: '' })).toBe(
        'title is required and must be a non-empty string'
      );
      expect(validateCreateTask({ title: '   ' })).toBe(
        'title is required and must be a non-empty string'
      );
    });

    it('should accept all valid statuses', () => {
      ['todo', 'in_progress', 'done'].forEach((status) => {
        expect(validateCreateTask({ title: 'T', status })).toBeNull();
      });
    });

    it('should reject invalid status', () => {
      const error = validateCreateTask({ title: 'T', status: 'archived' });
      expect(error).toBe('status must be one of: todo, in_progress, done');
    });

    it('should accept all valid priorities', () => {
      ['low', 'medium', 'high'].forEach((priority) => {
        expect(validateCreateTask({ title: 'T', priority })).toBeNull();
      });
    });

    it('should reject invalid priority', () => {
      const error = validateCreateTask({ title: 'T', priority: 'critical' });
      expect(error).toBe('priority must be one of: low, medium, high');
    });

    it('should accept valid ISO dueDate', () => {
      expect(
        validateCreateTask({ title: 'T', dueDate: '2026-12-31T23:59:59.000Z' })
      ).toBeNull();
      expect(
        validateCreateTask({ title: 'T', dueDate: '2026-06-01' })
      ).toBeNull();
    });

    it('should reject invalid dueDate string', () => {
      const error = validateCreateTask({ title: 'T', dueDate: 'not-a-date' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  // ─── validateUpdateTask ────────────────────────────────────

  describe('validateUpdateTask', () => {
    it('should return null for empty body (no fields to update)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('should return null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'New title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-10-01T12:00:00.000Z' })).toBeNull();
    });

    it('should reject non-string or whitespace-only title if title is provided', () => {
      expect(validateUpdateTask({ title: 123 })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
    });

    it('should reject invalid status', () => {
      const error = validateUpdateTask({ status: 'pending' });
      expect(error).toBe('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority', () => {
      const error = validateUpdateTask({ priority: 'urgent' });
      expect(error).toBe('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate', () => {
      const error = validateUpdateTask({ dueDate: 'invalid-date' });
      expect(error).toBe('dueDate must be a valid ISO date string');
    });
  });

  // ─── validateAssignTask ────────────────────────────────────

  describe('validateAssignTask', () => {
    it('should return null for valid assignee name', () => {
      expect(validateAssignTask({ assignee: 'Alice Johnson' })).toBeNull();
    });

    it('should reject null or undefined body', () => {
      expect(validateAssignTask(null)).toBe(
        'assignee is required and must be a non-empty string'
      );
      expect(validateAssignTask(undefined)).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    it('should reject missing assignee', () => {
      expect(validateAssignTask({})).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    it('should reject non-string assignee', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe(
        'assignee is required and must be a non-empty string'
      );
      expect(validateAssignTask({ assignee: true })).toBe(
        'assignee is required and must be a non-empty string'
      );
      expect(validateAssignTask({ assignee: ['Alice'] })).toBe(
        'assignee is required and must be a non-empty string'
      );
    });

    it('should reject empty or whitespace-only assignee', () => {
      expect(validateAssignTask({ assignee: '' })).toBe(
        'assignee is required and must be a non-empty string'
      );
      expect(validateAssignTask({ assignee: '   ' })).toBe(
        'assignee is required and must be a non-empty string'
      );
    });
  });
});
