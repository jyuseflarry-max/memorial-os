# 🏛️ Memorial-OS Project Constitution & Guidelines

@Agents.md

## 🎯 The North Star: Scaling & Performance
*   **Target Scale:** 10,000 Tenants / 1 Million+ Users.
*   **Efficiency First:** Code must be optimized to minimize infrastructure overhead. Every millisecond of latency at the 1-user level is a systemic failure at the 1-million-user level.
*   **100% Statelessness:** The application layer must remain stateless. All session, configuration, and tenant data must be externalized to support instant horizontal scaling.
*   **Resource Governance:** Every module must implement "Noisy Neighbor" protections (rate-limiting and quotas) to ensure one tenant cannot degrade system-wide performance.

---

## 🏗️ Design Philosophy (The Ousterhout Standard)
*   **Deep Modules:** Favor "Deep" modules with simple, powerful interfaces that hide significant internal complexity. Minimize "Shallow" modules that add layers of abstraction without adding functionality.
*   **Information Hiding:** High-level business logic must be "blind" to the underlying implementation of multi-tenancy, database drivers, or third-party APIs.
*   **Pull Complexity Downwards:** If a task is inherently complex, move that complexity into the lowest-level module possible. It is better for one developer to solve a hard problem in a low-level module than for 50 developers to deal with it in the UI.
*   **Define Errors Out of Existence:** Design APIs so that "exceptional" cases are either impossible to reach or handled automatically with sensible, safe defaults. Reduce the cognitive load of constant try/catch blocks.
*   **Strategic vs. Tactical Programming:** Reject "Tactical" fixes that just make the code work. Every change must be "Strategic," improving the long-term design and reducing the system’s total complexity.

---

## 🛡️ Safety & Data Isolation (The Zero-Leak Policy)
*   **Isolation via Abstraction:** Business logic is forbidden from direct database access. All data must flow through a "Deep" Data Access Layer (DAL) that programmatically injects `tenant_id` scoping.
*   **Mandatory Tenant Scoping:** Every request must be cryptographically tied to a `tenant_id`. 
*   **Server-Side Enforcement:** Row-Level Security (RLS) is the primary line of defense. Client-side filtering is for UX only, never for security.
*   **PII Protection:** Sensitive data (PII/PHI) must be encrypted at rest. Logs must be automatically scrubbed of any data that could identify a user or leak tenant secrets.

---

## 🎨 Front-End Component Checklist
1.  **Context Awareness:** Components must derive state from a unified `tenantContext`.
2.  **State Purging:** On logout or tenant-switch, a "Hard Reset" of the application state is mandatory to prevent cross-tenant data ghosting.
3.  **Idempotency & Safety:** All write actions must use `clientSideUuid` keys and loading states to prevent duplicate processing in high-latency environments.
4.  **Payload Efficiency:** Implement "Slim Views"—modules should only fetch the minimum required columns. Avoid `SELECT *` patterns that bloat the network at scale.
5.  **Graceful Degradation:** Use skeleton screens and ensure the core UI remains responsive even if non-critical sub-services (e.g., analytics) are slow or down.

---

## 🛠️ Operational Rules for Claude
1.  **Ousterhout Audit:** Before writing code, identify if the proposed solution is "Shallow" or "Deep." If it adds complexity to the caller, suggest a refactor to "Pull Complexity Down."
2.  **Scalability Guard:** Flag any logic that uses $O(N^2)$ complexity or creates N+1 query risks.
3.  **Security First:** If a feature request risks a data leak or bypasses the DAL, you must provide a "Secure Alternative" rather than fulfilling the request as written.
4.  **Maintainability:** Ensure code follows DRY (Don't Repeat Yourself) and has a low "Cognitive Load" score—a developer should understand a module's purpose by looking at its interface alone.