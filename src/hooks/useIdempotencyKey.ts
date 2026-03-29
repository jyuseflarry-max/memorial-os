"use client";
import { useState, useCallback } from "react";

function newKey(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Generates a stable idempotency key for a form or action.
 *
 * The same key is reused on network retries (protecting against double-creates).
 * Call `refresh()` after a successful submission so the next distinct operation
 * gets a fresh key.
 *
 * Usage:
 *   const { key, refresh } = useIdempotencyKey();
 *
 *   async function handleSubmit() {
 *     const res = await fetch("/api/players", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json", "Idempotency-Key": key },
 *       body: JSON.stringify(data),
 *     });
 *     if (res.ok) { refresh(); onClose(); }
 *   }
 */
export function useIdempotencyKey() {
  const [key, setKey] = useState(newKey);
  const refresh = useCallback(() => setKey(newKey()), []);
  return { key, refresh };
}
