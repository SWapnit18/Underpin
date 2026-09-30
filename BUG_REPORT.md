# Bug Report: The Untested API

This document details the bugs identified during testing of the Task Manager API codebase, their discovery methods, root causes, and resolutions.

---

## Summary of Findings

| ID | Issue | Location | Severity | Status |
|---|---|---|---|---|
| **BUG-01** | `completeTask` overwrites task priority to `medium` | `src/services/taskService.js:69` | High | **Fixed & Tested** |
| **BUG-02** | Off-by-one pagination offset skips page 1 records | `src/services/taskService.js:12` | High | **Fixed & Tested** |
| **BUG-03** | `getByStatus` uses loose substring matching (`.includes`) | `src/services/taskService.js:9` | Medium | Documented with unit test |
| **BUG-04** | Missing fallback 404 JSON handler for unknown routes | `src/app.js` | Low | Documented |

---

## Detailed Bug Reports

### Bug 1: Complete Task Overwrites Existing Priority

- **Severity:** High
- **Location:** `src/services/taskService.js` (inside `completeTask`)
- **Expected Behavior:**
  When marking a task as complete via `completeTask(id)` or `PATCH /tasks/:id/complete`, the task's `status` should change to `'done'` and `completedAt` should be populated with the current ISO timestamp. The original task's `priority` (`'high'`, `'low'`, etc.) must remain unchanged.
- **Actual Behavior:**
  The `completeTask` method explicitly set `priority: 'medium'` in the updated object:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // <--- Bug
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
  Any task originally created with `priority: 'high'` or `priority: 'low'` silently had its priority overwritten to `'medium'`.
- **Discovery Method:**
  Discovered while writing unit tests for `completeTask` with a task initialized to `priority: 'high'`, which failed assertion `expect(completed.priority).toBe('high')`.
- **Fix Applied:**
  Removed `priority: 'medium'` from the return object so `...task` retains the existing priority:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Verification:**
  Covered by `taskService.test.js` ("should preserve the original priority") and `tasks.routes.test.js` ("should mark task as complete and preserve existing priority").

---

### Bug 2: Off-By-One Offset in Pagination

- **Severity:** High
- **Location:** `src/services/taskService.js` (inside `getPaginated`)
- **Expected Behavior:**
  For standard 1-based page indexing (`page=1`, `limit=2`), page 1 should return items with indices 0 through 1 (offset 0). Page 2 should return items with indices 2 through 3 (offset 2).
- **Actual Behavior:**
  The offset calculation was implemented as:
  ```javascript
  const offset = page * limit;
  return tasks.slice(offset, offset + limit);
  ```
  For `page=1, limit=2`, `offset = 1 * 2 = 2`. The first two tasks in the collection were skipped on page 1, returning items 2 and 3 instead.
- **Discovery Method:**
  Discovered while writing integration tests for `GET /tasks?page=1&limit=2` on a dataset of 5 created tasks, where page 1 unexpectedly returned `Task 3` and `Task 4`.
- **Fix Applied:**
  Corrected the formula to `(pageNum - 1) * limitNum` along with defensive integer parsing:
  ```javascript
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const offset = (pageNum - 1) * limitNum;
  return tasks.slice(offset, offset + limitNum);
  ```
- **Verification:**
  Covered by `taskService.test.js` ("should return first page correctly", "should return second page correctly") and `tasks.routes.test.js`.

---

### Bug 3: Loose Status Filtering with `.includes()`

- **Severity:** Medium
- **Location:** `src/services/taskService.js` (inside `getByStatus`)
- **Expected Behavior:**
  Querying tasks by status (e.g. `getByStatus('todo')` or `GET /tasks?status=todo`) should match exact status equality (`t.status === status`).
- **Actual Behavior:**
  The filtering logic was:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
  Because it uses `String.prototype.includes()`, querying with partial strings like `status=do` matches both `todo` and `done`.
- **Discovery Method:**
  Identified during source code review and documented with an explicit regression/diagnostic test in `taskService.test.js` (`should match partial status strings due to .includes() bug`).
- **Recommended Fix:**
  Change condition to exact match:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### Bug 4: Missing Fallback JSON 404 for Unknown Endpoints

- **Severity:** Low
- **Location:** `src/app.js`
- **Expected Behavior:**
  Non-existent endpoints (e.g. `GET /users`, `POST /tasks/unknown/route`) should return a consistent JSON response: `{ "error": "Not found" }` with HTTP 404 status.
- **Actual Behavior:**
  Express defaults to returning an HTML `Cannot GET /unknown` page because no catch-all route handler is registered.
- **Recommended Fix:**
  Add a catch-all middleware in `app.js` before the error handler:
  ```javascript
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
  ```
