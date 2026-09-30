const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  // ─── GET /tasks ───────────────────────────────────────────

  describe('GET /tasks', () => {
    it('should return empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status when status query param provided', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('T2');
      expect(res.body[0].status).toBe('in_progress');
    });

    it('should support pagination with page and limit query params', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Item ${i}` });
      }

      const resPage1 = await request(app).get('/tasks?page=1&limit=2');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body).toHaveLength(2);
      expect(resPage1.body[0].title).toBe('Item 1');
      expect(resPage1.body[1].title).toBe('Item 2');

      const resPage2 = await request(app).get('/tasks?page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body).toHaveLength(2);
      expect(resPage2.body[0].title).toBe('Item 3');
      expect(resPage2.body[1].title).toBe('Item 4');
    });

    it('should handle pagination fallback defaults when invalid page/limit passed', async () => {
      taskService.create({ title: 'Item 1' });
      const res = await request(app).get('/tasks?page=bad&limit=bad');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  // ─── GET /tasks/stats ─────────────────────────────────────

  describe('GET /tasks/stats', () => {
    it('should return initial zero counts', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return accurate counts for statuses and overdue tasks', async () => {
      const past = new Date(Date.now() - 50000).toISOString();
      const future = new Date(Date.now() + 50000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: past }); // overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: future });
      taskService.create({ title: 'T3', status: 'done', dueDate: past }); // done is not overdue

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  // ─── POST /tasks ──────────────────────────────────────────

  describe('POST /tasks', () => {
    it('should create a task with 201 Created and default values', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    it('should create a task with custom fields', async () => {
      const dueDate = '2026-11-01T00:00:00.000Z';
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Custom Task',
          description: 'Detailed instructions',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Custom Task');
      expect(res.body.description).toBe('Detailed instructions');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(dueDate);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    it('should return 400 if title is empty or whitespace', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('title is required');
    });

    it('should return 400 if status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'unknown' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status must be one of');
    });

    it('should return 400 if priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'extreme' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('priority must be one of');
    });

    it('should return 400 if dueDate is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dueDate must be a valid ISO date');
    });
  });

  // ─── PUT /tasks/:id ───────────────────────────────────────

  describe('PUT /tasks/:id', () => {
    it('should update task and return 200', async () => {
      const created = taskService.create({ title: 'Original', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Title', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 for validation errors in update body', async () => {
      const created = taskService.create({ title: 'Task' });

      const resStatus = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'invalid' });
      expect(resStatus.status).toBe(400);

      const resTitle = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: '  ' });
      expect(resTitle.status).toBe(400);

      const resPriority = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'invalid' });
      expect(resPriority.status).toBe(400);

      const resDate = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ dueDate: 'bad-date' });
      expect(resDate.status).toBe(400);
    });
  });

  // ─── DELETE /tasks/:id ────────────────────────────────────

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204 No Content', async () => {
      const created = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/missing-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  // ─── PATCH /tasks/:id/complete ────────────────────────────

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark task as complete and preserve existing priority', async () => {
      const created = taskService.create({ title: 'Priority High', priority: 'high' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).patch('/tasks/missing-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  // ─── PATCH /tasks/:id/assign ──────────────────────────────

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task and return 200 with updated task', async () => {
      const created = taskService.create({ title: 'Unassigned task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Doe');
      expect(res.body.id).toBe(created.id);
    });

    it('should return 400 when assignee is missing or empty', async () => {
      const created = taskService.create({ title: 'Task' });

      const resEmpty = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toContain('assignee is required');

      const resWhitespace = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   ' });
      expect(resWhitespace.status).toBe(400);

      const resNonString = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 12345 });
      expect(resNonString.status).toBe(400);
    });

    it('should return 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 409 Conflict when task is already assigned', async () => {
      const created = taskService.create({ title: 'Assigned Task' });
      await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'First Assignee' });

      const resSecond = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Second Assignee' });

      expect(resSecond.status).toBe(409);
      expect(resSecond.body.error).toBe('Task is already assigned');
    });
  });
});
