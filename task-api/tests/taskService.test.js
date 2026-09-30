const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ─── create ──────────────────────────────────────────────

  describe('create', () => {
    it('should create a task with default fields', () => {
      const task = taskService.create({ title: 'Task 1' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Task 1');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    it('should create a task with all custom fields', () => {
      const dueDate = new Date().toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Full description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Full description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });

    it('should generate unique IDs for each task', () => {
      const t1 = taskService.create({ title: 'A' });
      const t2 = taskService.create({ title: 'B' });

      expect(t1.id).not.toBe(t2.id);
    });
  });

  // ─── getAll ──────────────────────────────────────────────

  describe('getAll', () => {
    it('should return empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });

      const all = taskService.getAll();
      expect(all).toHaveLength(3);
    });

    it('should return a copy, not a reference to internal store', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.push({ title: 'Injected' });

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  // ─── findById ────────────────────────────────────────────

  describe('findById', () => {
    it('should find and return a task by its ID', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined for non-existent ID', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });
  });

  // ─── getByStatus ─────────────────────────────────────────

  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'In Progress Task', status: 'in_progress' });
      taskService.create({ title: 'Done Task', status: 'done' });
    });

    it('should return tasks matching the given status', () => {
      const todos = taskService.getByStatus('todo');
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe('Todo Task');
    });

    it('should return empty array when no tasks match', () => {
      taskService._reset();
      taskService.create({ title: 'Only Todo', status: 'todo' });

      expect(taskService.getByStatus('done')).toEqual([]);
    });

    /*
     * BUG DEMONSTRATION: getByStatus uses String.includes() instead of ===.
     * A partial status like "do" matches both "todo" (contains "do") and
     * potentially "done" (contains "do"). This test documents the buggy behavior.
     */
    it('should match partial status strings due to .includes() bug', () => {
      const results = taskService.getByStatus('do');
      // 'todo'.includes('do') => true, 'done'.includes('do') => true
      expect(results.length).toBe(2);
    });
  });

  // ─── getPaginated ────────────────────────────────────────

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('should return first page correctly (page=1, limit=2)', () => {
      const page1 = taskService.getPaginated(1, 2);

      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    it('should return second page correctly (page=2, limit=2)', () => {
      const page2 = taskService.getPaginated(2, 2);

      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');
    });

    it('should return last partial page (page=3, limit=2)', () => {
      const page3 = taskService.getPaginated(3, 2);

      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });

    it('should return empty array for out-of-bounds page', () => {
      expect(taskService.getPaginated(100, 10)).toEqual([]);
    });

    it('should default to page 1 for invalid page values', () => {
      const result = taskService.getPaginated('abc', 2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
    });

    it('should default to limit 10 for invalid limit values', () => {
      const result = taskService.getPaginated(1, 'abc');
      expect(result).toHaveLength(5); // only 5 tasks exist, limit defaults to 10
    });
  });

  // ─── getStats ────────────────────────────────────────────

  describe('getStats', () => {
    it('should return all zeros when no tasks exist', () => {
      expect(taskService.getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should count tasks by status correctly', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks (past due, not done)', () => {
      const past = new Date(Date.now() - 100000).toISOString();
      taskService.create({ title: 'Overdue', status: 'todo', dueDate: past });

      expect(taskService.getStats().overdue).toBe(1);
    });

    it('should NOT count completed tasks as overdue even if past due', () => {
      const past = new Date(Date.now() - 100000).toISOString();
      taskService.create({ title: 'Done Overdue', status: 'done', dueDate: past });

      expect(taskService.getStats().overdue).toBe(0);
    });

    it('should NOT count tasks with future due dates as overdue', () => {
      const future = new Date(Date.now() + 100000).toISOString();
      taskService.create({ title: 'Future', status: 'todo', dueDate: future });

      expect(taskService.getStats().overdue).toBe(0);
    });

    it('should NOT count tasks without due dates as overdue', () => {
      taskService.create({ title: 'No Due', status: 'todo' });

      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  // ─── update ──────────────────────────────────────────────

  describe('update', () => {
    it('should update specified fields and return updated task', () => {
      const task = taskService.create({ title: 'Original', priority: 'low' });
      const updated = taskService.update(task.id, { title: 'Changed', priority: 'high' });

      expect(updated.title).toBe('Changed');
      expect(updated.priority).toBe('high');
    });

    it('should persist changes in the store', () => {
      const task = taskService.create({ title: 'Before' });
      taskService.update(task.id, { title: 'After' });

      expect(taskService.findById(task.id).title).toBe('After');
    });

    it('should preserve unmodified fields', () => {
      const task = taskService.create({ title: 'Keep', priority: 'high', status: 'todo' });
      const updated = taskService.update(task.id, { title: 'New Title' });

      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('todo');
    });

    it('should return null for non-existent task', () => {
      expect(taskService.update('fake-id', { title: 'X' })).toBeNull();
    });
  });

  // ─── remove ──────────────────────────────────────────────

  describe('remove', () => {
    it('should remove a task and return true', () => {
      const task = taskService.create({ title: 'Delete Me' });

      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      expect(taskService.remove('fake-id')).toBe(false);
    });

    it('should not affect other tasks', () => {
      const t1 = taskService.create({ title: 'Keep' });
      const t2 = taskService.create({ title: 'Remove' });

      taskService.remove(t2.id);

      expect(taskService.getAll()).toHaveLength(1);
      expect(taskService.findById(t1.id)).toBeDefined();
    });
  });

  // ─── completeTask ────────────────────────────────────────

  describe('completeTask', () => {
    it('should set status to done and populate completedAt', () => {
      const task = taskService.create({ title: 'Finish Me', status: 'todo' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    it('should preserve the original priority (regression test for priority overwrite bug)', () => {
      const task = taskService.create({ title: 'High Priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
    });

    it('should preserve other fields like title and description', () => {
      const task = taskService.create({
        title: 'My Task',
        description: 'Important',
        priority: 'low',
      });
      const completed = taskService.completeTask(task.id);

      expect(completed.title).toBe('My Task');
      expect(completed.description).toBe('Important');
    });

    it('should return null for non-existent task', () => {
      expect(taskService.completeTask('fake-id')).toBeNull();
    });
  });

  // ─── assignTask ──────────────────────────────────────────

  describe('assignTask', () => {
    it('should assign a person to an unassigned task', () => {
      const task = taskService.create({ title: 'Assign Me' });
      const result = taskService.assignTask(task.id, 'Alice');

      expect(result.assignee).toBe('Alice');
      expect(result.title).toBe('Assign Me');
    });

    it('should persist the assignment in the store', () => {
      const task = taskService.create({ title: 'Persist Test' });
      taskService.assignTask(task.id, 'Bob');

      expect(taskService.findById(task.id).assignee).toBe('Bob');
    });

    it('should return { conflict: true } when task is already assigned', () => {
      const task = taskService.create({ title: 'Already Assigned' });
      taskService.assignTask(task.id, 'Alice');

      const result = taskService.assignTask(task.id, 'Bob');

      expect(result.conflict).toBe(true);
      expect(result.task.assignee).toBe('Alice');
    });

    it('should return null for non-existent task', () => {
      expect(taskService.assignTask('fake-id', 'Alice')).toBeNull();
    });

    it('should preserve all existing task fields', () => {
      const task = taskService.create({
        title: 'Full Task',
        description: 'Details',
        priority: 'high',
        status: 'in_progress',
      });
      const result = taskService.assignTask(task.id, 'Charlie');

      expect(result.title).toBe('Full Task');
      expect(result.description).toBe('Details');
      expect(result.priority).toBe('high');
      expect(result.status).toBe('in_progress');
    });
  });

  // ─── _reset ──────────────────────────────────────────────

  describe('_reset', () => {
    it('should clear all tasks', () => {
      taskService.create({ title: 'A' });
      taskService.create({ title: 'B' });

      taskService._reset();

      expect(taskService.getAll()).toEqual([]);
    });
  });
});
