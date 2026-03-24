/**
 * Standard API error response — single source of truth for all route handlers.
 * Eliminates the repeated `Response.json({ error: ... }, { status: 500 })` pattern.
 */
export function apiError(err: unknown, status = 500): Response {
  let message: string;
  if (err instanceof Error) {
    message = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    message = String((err as { message: unknown }).message);
  } else {
    message = String(err);
  }
  return Response.json({ error: message }, { status });
}
