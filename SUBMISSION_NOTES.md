# Submission Notes: The Untested API

## 1. What I'd Test Next (If Given More Time)

1. **Concurrency and Race Conditions:**
   The current data store is an in-memory JavaScript array mutated in place. In a concurrent production environment with asynchronous I/O and worker clusters, racing writes (such as simultaneous updates, assignment requests, and deletions for the same task ID) can create inconsistent state. I would test concurrent access patterns and simulate race conditions.

2. **Fuzz & Property-Based Testing:**
   Using tools like `fast-check` to send unexpected payloads, extreme unicode characters (e.g. emojis, right-to-left marks, null bytes), enormous payloads (10MB+ strings), and edge case ISO-8601 timestamps (leap seconds, boundary years, timezone offsets) to verify input robustness.

3. **Performance & Memory Leaks under Load:**
   Load testing with `k6` or `autocannon` to observe pagination latencies with 100,000+ tasks in memory and verify that garbage collection properly frees memory when tasks are deleted.

4. **Security & Header Validation:**
   Testing for injection vulnerabilities (NoSQL/SQL if persisted), Cross-Site Scripting (stored XSS in descriptions rendered on a frontend), HTTP Parameter Pollution, and verifying CORS / Rate Limiting behavior.

---

## 2. What Surprised Me in the Codebase

1. **Direct In-Memory Array Mutations:**
   In several places, tasks returned by functions like `findById` were direct object references rather than cloned objects, which could allow accidental mutation outside the service layer.
2. **Subtle Intentional-Looking Bugs:**
   The hardcoding of `priority: 'medium'` in `completeTask` was particularly insidious because it looks like normal default assignment on a quick glance, but actually destroys existing user data silently upon task completion.
3. **Pagination Multiplier Logic:**
   The off-by-one error (`page * limit`) is a classic trap when mapping 1-indexed human pages to 0-indexed internal arrays, which completely omitted page 1 data.
4. **Already-Assigned Conflict Handling:**
   The assignment feature needed careful consideration between idempotency (overwriting assignment) and conflict management (returning 409 Conflict to protect against accidental task theft), making HTTP 409 the cleaner semantic choice.

---

## 3. Questions to Ask Before Shipping to Production

1. **Persistence & Database Strategy:**
   - Which persistent storage engine (PostgreSQL, MongoDB, Redis) should replace the in-memory array?
   - How should transactions and connection pooling be configured?

2. **Authentication & Authorization:**
   - How will users be authenticated (JWT, session tokens, OAuth2/OIDC)?
   - Can any user assign tasks, or should assignment be restricted to task owners or managers?
   - Should users only be allowed to view tasks assigned to them or their organization (multi-tenancy)?

3. **Validation & Schema Management:**
   - Would the team prefer a formalized schema validator like Zod or Joi to enforce strict input sanitization across all request bodies and query params?

4. **Observability & Logging:**
   - What structured logging (e.g. Pino, Winston) and APM monitoring (e.g. Datadog, OpenTelemetry) should be integrated?
   - What health check probe (`/healthz`, `/readyz`) is required by the deployment orchestration (Docker / Kubernetes)?

5. **Rate Limiting & DDoS Protection:**
   - What rate limits should be applied to prevent denial-of-service on endpoints like `GET /tasks` and `POST /tasks`?
