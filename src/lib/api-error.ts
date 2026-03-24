/**
 * Standard API error response — single source of truth for all route handlers.
 * Eliminates the repeated `Response.json({ error: ... }, { status: 500 })` pattern.
 */
export function apiError(err: unknown, status = 500): Response {
  return Response.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    { status },
  );
}
