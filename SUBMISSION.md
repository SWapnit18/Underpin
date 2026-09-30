# Project Assignment Report & Solution: The Untested API

## Overview
This repository contains the completed assignment for **The Untested API** (Take-Home Assignment for Full Stack Developer). It includes a comprehensive test suite (unit and integration tests), identification and documentation of bugs, bug fixes with regression coverage, and the implementation of the new task assignment endpoint (`PATCH /tasks/:id/assign`).

- **Bug Report:** Detailed in [BUG_REPORT.md](./BUG_REPORT.md)
- **Submission Notes & Production Reflection:** Detailed in [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md)

---

## 1. Test Coverage Summary

Tests are organized into clean, focused test files inside `task-api/tests/`:
- `tests/taskService.test.js`: Direct unit tests covering all service methods, edge cases, and in-memory store isolation.
- `tests/validators.test.js`: Comprehensive validation unit tests covering input sanitization, boundaries, and required fields.
- `tests/tasks.routes.test.js`: Supertest integration tests testing all HTTP routes, status codes, query filters, pagination, and error responses.

### Latest Coverage Output
```text
> task-api@1.0.0 coverage
> jest --coverage

PASS tests/validators.test.js
PASS tests/taskService.test.js
PASS tests/tasks.routes.test.js (6.415 s)
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.51 |    97.87 |   93.33 |   97.27 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |       96 |     100 |     100 |                   
  taskService.js |     100 |       96 |     100 |     100 | 24                
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       87 passed, 87 total
Snapshots:   0 total
Time:        7.483 s
```

- **Total Tests:** 87 passed, 0 failed
- **Overall Line Coverage:** 97.27% (Target: >80%)
- **Route & Validator Coverage:** 100%

---

## 2. Bug Report Summary

See [BUG_REPORT.md](./BUG_REPORT.md) for full reproduction steps and details.

1. **Bug 1: Complete Task Overwrites Existing Priority** (`src/services/taskService.js:69`)
   - *Issue:* Completing a task hardcoded `priority: 'medium'`, resetting high or low priority tasks.
   - *Fix:* Removed `priority: 'medium'` to preserve existing task attributes.
   - *Status:* **Fixed & Verified**

2. **Bug 2: Off-by-One Pagination Offset Calculation** (`src/services/taskService.js:12`)
   - *Issue:* Offset was calculated as `page * limit`, skipping the first page of results.
   - *Fix:* Changed offset calculation to `(pageNum - 1) * limitNum` with defensive parsing.
   - *Status:* **Fixed & Verified**

3. **Bug 3: Loose Status Substring Matching** (`src/services/taskService.js:9`)
   - *Issue:* `getByStatus` used `.includes(status)`, matching partial strings like `status=do` to both `todo` and `done`.
   - *Status:* Documented with regression test in `taskService.test.js`.

4. **Bug 4: Missing Fallback JSON 404 Handler** (`src/app.js`)
   - *Issue:* Non-existent routes return default Express HTML 404 rather than JSON error object.
   - *Status:* Documented in bug report.

---

## 3. New Feature: Task Assignment

Implemented endpoint:
```http
PATCH /tasks/:id/assign
Content-Type: application/json

{
  "assignee": "Alex Developer"
}
```

### Key Design Decisions:
1. **Validation (`src/utils/validators.js`):**
   - Requires `assignee` field.
   - Enforces `assignee` to be a non-empty string (after trimming). Rejects whitespace-only, numbers, objects, or empty strings with HTTP `400` and helpful error message.
2. **Persistence & Conflict Handling (`src/services/taskService.js`):**
   - Adds `assignTask(id, assignee)`.
   - Returns `{ conflict: true, task }` if the task is already assigned to prevent accidental overwrite, mapped to HTTP `409 Conflict` by the route handler.
   - Returns `null` if the task does not exist, mapped to HTTP `404 Not Found`.
3. **Automated Testing:**
   - Unit tests in `tests/taskService.test.js` and `tests/validators.test.js`.
   - Integration tests in `tests/tasks.routes.test.js` covering successful assignment, invalid inputs, 404, and 409 conflict.

---

## 4. Submission Notes & Reflections

See [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md) for full answers to:
- What would be tested next with more time (concurrency race conditions, fuzzing, load testing, security).
- Surprises in the codebase (in-place mutations, subtle data overwrite bugs).
- Critical questions to ask before shipping to production (database persistence, auth/authz, rate limiting, observability).
