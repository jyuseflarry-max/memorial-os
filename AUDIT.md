# Ousterhout Scalability Audit — memorial-os
_Generated: 2026-03-31_

---

## Overall Report Card

| Category | Grade | Notes |
|---|---|---|
| Module Depth (Deep vs. Shallow) | **B+** | DAL, apiError, and contexts are excellent. Audit reveals ~4 routes that are Shallow — they re-implement tenant lookup logic already in `getDb()`. |
| Information Hiding | **B** | `getDb()` is a strong abstraction. But ~4 routes leak implementation details by calling `getSupabaseUser() + getSupabaseServer()` directly in the handler body. |
| Error Definition (Define Errors Out of Existence) | **B-** | `apiError()` exists and is excellent — but 6 routes don't use it, creating 3 different error response shapes. |
| Cognitive Load | **C+** | Hardcoded role arrays `["Admin", "Coach", "Manager"]` appear 5× across files; `["Admin", "Coach"]` appears 2× — the inconsistency forces developers to cross-reference every check. |
| Strategic vs. Tactical | **C** | Legacy singleton fallback in `settings/route.ts`, no rate limiting anywhere, SELECT * in schedule routes, POST 201 missing in practice-schedule — these are tactical fixes left behind. |

---

## Module-by-Module Analysis

### DEEP MODULES (Simple interface, hides complexity — good)

| Module | Grade | Notes |
|---|---|---|
| `src/lib/db.ts` | **A** | Single `getDb()` call auto-injects tenant on every method. Perfect information hiding. |
| `src/lib/api-error.ts` | **A** | One-line usage, hides HTTP response formatting. |
| `src/lib/conversations.ts` | **B+** | Good abstraction for find-or-create. Has a 2-query N+1 risk (fixable with single JOIN). |
| `src/app/api/drills/route.ts` | **A-** | Proper junction-table handling, idempotency wrapper, parallel Promise.all. |
| `src/app/api/strength/biometrics/route.ts` | **A-** | Role-based view, PII decryption, justified `getSupabaseServer()` for onConflict. |
| `src/app/api/strength/inventory/route.ts` | **B+** | Good catalog merge, justified service client for onConflict. |
| `src/app/api/strength/lifts/route.ts` | **B+** | Clean, minimal, proper filtering. |
| `src/app/api/strength/programs/route.ts` | **B+** | Minimal API, properly scoped. |
| `src/app/api/strength/exercises/route.ts` | **B+** | Correctly falls back to service client for OR query; explains why in comment. |
| `src/app/api/attendance/route.ts` | **B** | Fully migrated to `getDb()`. Has hardcoded role array `["Admin", "Coach", "Manager"]`. |
| `src/app/api/strength-schedule/route.ts` | **B** | Uses `getDb()` but uses `NextResponse.json` for errors instead of `apiError()`. |
| `src/app/api/strength-schedule/[id]/route.ts` | **B** | Uses `getDb()` but throws instead of `apiError()`. |
| `src/app/api/practice-schedule/[id]/route.ts` | **B** | Uses `getDb()` but throws instead of `apiError()`. |
| `src/context/DrillContext.tsx` | **B+** | Binary-search sorted insert, name-change detection to skip re-sort. Silent error catch is a minor flaw. |
| `src/context/FacilitiesContext.tsx` | **A-** | Error state tracking, explicit `refresh()`, optimistic updates. Best context in the codebase. |

### SHALLOW MODULES (Thin wrappers that add layers without hiding complexity — needs work)

| Module | Grade | Red Flags |
|---|---|---|
| `src/app/api/attendance/report/route.ts` | **D** | Manually calls `getSupabaseUser() + getSupabaseServer()` + users lookup. Duplicates auth boilerplate already solved by `getDb()`. Hardcoded role array. |
| `src/app/api/attendance/consequences/route.ts` | **D** | Same manual auth boilerplate. Role array `["Admin", "Coach"]` inconsistent with attendance's `["Admin", "Coach", "Manager"]`. |
| `src/app/api/facilities/route.ts` | **D** | Manual auth boilerplate. `SELECT *` in 3 places. GET doesn't wrap errors in `apiError()`. |
| `src/app/api/facilities/[id]/route.ts` | **D** | Manual auth boilerplate. Repeats role array. `SELECT *` in PATCH. |
| `src/app/api/conversations/[id]/messages/route.ts` | **D+** | Manual `getSupabaseUser()`. Participation verification duplicated between GET and POST. No `apiError()`. |
| `src/app/api/settings/route.ts` | **C-** | Custom `getTenantId()` helper instead of `getDb()`. `SELECT *` twice. Legacy singleton fallback still active with no removal plan. |
| `src/app/api/conversations/route.ts` | **C+** | Uses `getDb()` correctly but falls back to `NextResponse.json` for error responses instead of `apiError()`. |
| `src/app/api/practice-schedule/route.ts` | **C** | Uses `getDb()` but `SELECT *` with nested joins, POST returns 200 instead of 201, errors via `NextResponse.json`. |

---

## Red Flags (Ordered by Severity)

### 🔴 CRITICAL

**RF-1: 4 Routes Bypass `getDb()` — Cross-Tenant Leak Risk**
- Files: `attendance/report`, `attendance/consequences`, `facilities`, `facilities/[id]`, `conversations/[id]/messages`
- Problem: Each manually does `getSupabaseUser() + getSupabaseServer() + users lookup`. If any step is skipped or misordered, a tenant_id leak is possible.
- Fix: Migrate all to `getDb()`.

**RF-2: `conversations/[id]/messages` — No Tenant Scoping on Message Insert**
- File: `src/app/api/conversations/[id]/messages/route.ts` (POST)
- Problem: `tenant_id` for the new message row is pulled from the `conversation_participants` table — not from a centralized auth source. If the participant row has a wrong tenant_id, the message inherits it silently.
- Fix: Use `getDb()` → `db.tenantId` directly.

### 🟠 HIGH

**RF-3: Hardcoded Role Arrays — 7 Occurrences**
- `["Admin", "Coach", "Manager"]` — 5 locations
- `["Admin", "Coach"]` — 2 locations
- Problem: These are out of sync. The attendance consequences route restricts to `["Admin", "Coach"]` while the attendance report restricts to `["Admin", "Coach", "Manager"]`. Managers can view reports but can't edit consequences — likely unintentional.
- Fix: Centralize in `src/lib/roles.ts`:
  ```ts
  export const ROLE_STAFF  = ["Admin", "Coach", "Manager"] as const;
  export const ROLE_COACH  = ["Admin", "Coach"] as const;
  ```
  Then `requireRole(db, ...ROLE_STAFF)`.

**RF-4: No Rate Limiting — Any Tenant Can Hammer Any Route**
- Problem: No per-tenant rate limiting exists anywhere in the codebase. At 10,000 tenants, one abusive tenant can degrade others.
- Fix: Implement Next.js middleware with IP + tenant-based rate limiting using a fast store (Redis/Upstash).

**RF-5: `db.from()` Issues a Hidden `.select()` — Silent Full Table Scan**
- File: `src/lib/db.ts`, `from()` method
- Problem: `from()` calls `.select()` with no arguments before applying `.eq("tenant_id", ...)`. This causes the ORM to emit a `SELECT *` before any `.select(col, col)` the caller adds. The caller's `.select()` overrides it at the PostgREST level, but this is fragile and non-obvious.
- Fix: Remove the `.select()` from `from()`: `return sb.from(table).eq("tenant_id", tenantId)`.

### 🟡 MODERATE

**RF-6: `findOrCreate1on1` — 2-Query N+1 Risk**
- File: `src/lib/conversations.ts`
- Problem: Query 1 fetches all conversation IDs for sender; Query 2 filters by recipient in those IDs. Could be replaced with a single SQL query using a JOIN or correlated subquery.
- Fix: `SELECT cp1.conversation_id FROM conversation_participants cp1 JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id WHERE cp1.user_id = $from AND cp2.user_id = $to AND cp1.tenant_id = $tenant LIMIT 1`

**RF-7: Legacy Singleton Fallback in `settings/route.ts`**
- Problem: The double fallback path (tenant row → legacy singleton row) creates a branch that will be executed for all new tenants until migrations are run. It also hides the failure mode — if the tenant row upsert fails for any reason other than missing `tenant_id`, the fallback silently persists stale settings.
- Fix: Remove the fallback once all tenants have been migrated to the multi-tenant settings schema.

**RF-8: `SELECT *` with Nested Joins in Schedule Routes**
- Files: `practice-schedule/route.ts`, `practice-schedule/[id]/route.ts`, `strength-schedule/route.ts`
- Pattern: `select("*, location:locations(*), facility:facilities(*)")`
- Problem: `*` fetches all columns from the base table AND nested `*` fetches all columns from joined tables. At scale, this bloats network payloads significantly.
- Fix: Enumerate columns explicitly: `select("id, schedule_date, start_time, end_time, notes, program:strength_programs(id,name,phase), facility:facilities(id,name)")`

**RF-9: Inconsistent Error Response Shape — 3 Different Formats**
- Routes using `apiError()` → `{ error: "message" }` with correct status
- Routes using `NextResponse.json({ error: ... }, { status })` → Same shape but not via helper
- Routes throwing `throw error` → Unhandled 500 with framework default shape
- Fix: Wrap all route handlers in a consistent try/catch with `apiError()`.

**RF-10: `conversations/route.ts` GET — 4-Step Query Chain**
- Step 1: Fetch conversation IDs for user
- Step 2: Fetch all participants in those conversations
- Step 3: Fetch last messages in those conversations (parallel with Step 2)
- Step 4: Fetch user profiles for all unique senders
- Problem: Step 4 is an N+1 (profile per sender, deduplicated). Acceptable for small groups, but scales poorly.
- Fix: Include `users(id, full_name, role)` in the participants select so profiles arrive in one query.

**RF-11: `practice-schedule/route.ts` POST Returns HTTP 200**
- Problem: Resource creation should return 201 Created.
- Fix: `return NextResponse.json(data, { status: 201 })`.

---

## Refactoring Roadmap (Priority Order)

### Priority 1 — Security / Correctness (Do First)

1. **Migrate 5 routes to `getDb()`**
   - `attendance/report/route.ts`
   - `attendance/consequences/route.ts`
   - `facilities/route.ts`
   - `facilities/[id]/route.ts`
   - `conversations/[id]/messages/route.ts`
   - Impact: Eliminates RF-1 and RF-2. Removes ~80 lines of duplicated auth boilerplate.

2. **Centralize role constants**
   - Create `src/lib/roles.ts` with `ROLE_STAFF` and `ROLE_COACH` constants
   - Replace all 7 hardcoded role arrays
   - Impact: Eliminates RF-3. Makes role definitions a single point of change.

### Priority 2 — Reliability / Consistency

3. **Standardize error handling — use `apiError()` everywhere**
   - `strength-schedule/route.ts`, `strength-schedule/[id]/route.ts`
   - `practice-schedule/route.ts`, `practice-schedule/[id]/route.ts`
   - `conversations/route.ts`, `conversations/[id]/messages/route.ts`
   - Impact: Eliminates RF-9. One consistent error shape for the entire API.

4. **Fix `db.from()` silent SELECT**
   - Remove `.select()` from the `from()` method in `src/lib/db.ts`
   - Impact: Eliminates RF-5. Prevents surprise full-table reads.

5. **Replace SELECT * in schedule routes with explicit columns**
   - `practice-schedule/route.ts`, `strength-schedule/route.ts`
   - Impact: Eliminates RF-8. Reduces payload size on every schedule fetch.

### Priority 3 — Performance / Scale

6. **Fix `findOrCreate1on1` — single JOIN query**
   - Replace 2-step query with single correlated JOIN
   - Impact: Eliminates RF-6. Halves DB round-trips for every message initiation.

7. **Add per-tenant rate limiting middleware**
   - Next.js middleware with Upstash Redis or similar
   - Impact: Eliminates RF-4. Required before any meaningful scale.

### Priority 4 — Technical Debt Cleanup

8. **Remove legacy singleton fallback in `settings/route.ts`**
   - Requires confirming all tenants migrated to multi-tenant schema
   - Impact: Eliminates RF-7. Removes hidden error suppression.

9. **Fix practice-schedule POST → return 201**
   - One-line fix
   - Impact: Eliminates RF-11. Correct HTTP semantics.

---

## Audit Statistics

| Metric | Count | Notes |
|---|---|---|
| Total routes audited | 21 | — |
| Routes using `getDb()` properly | 12 | 57% adoption |
| Routes bypassing `getDb()` | 5 | Security risk |
| Routes using `apiError()` consistently | 11 | — |
| Routes with inconsistent error handling | 6 | — |
| Routes with `SELECT *` patterns | 7 | 2 justified |
| Files with hardcoded role checks | 7 | 5 duplicates |
| Critical red flags | 2 | Must fix |
| High red flags | 3 | Fix soon |
| Moderate red flags | 6 | Backlog |

---

_Run this audit again after implementing Priority 1 and 2 items. Target score: Module Depth A-, Cognitive Load B+, Strategic vs. Tactical B+._
