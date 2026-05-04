-- ============================================================
-- MESSAGING MODULE — Database Migration
-- Run in Supabase SQL Editor (Database → SQL Editor)
--
-- Idempotent: safe to re-run. The live database already contains the
-- core `conversations`, `conversation_participants`, and `messages`
-- tables (created ad-hoc); this migration brings them under version
-- control and adds:
--   • denormalized last_message_* columns on conversations (drives the
--     thread list without an N+1 fan-out across messages)
--   • client_uuid on messages (server-side idempotency for retries)
--   • pair_key on conversations (eliminates the 1:1 race in
--     findOrCreate1on1 via a unique index)
--   • kind + metadata on messages (typed system messages, e.g. the
--     attendance auto-notify)
--   • length cap on body (4 KB)
--   • Row-Level Security policies that scope reads/writes to the
--     calling user's tenant + thread participation. Enabling RLS also
--     auto-scopes the Realtime subscription used by the unread badge
--     so users no longer receive INSERT events for other tenants.
-- ============================================================

-- ── 1. Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  title       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id  UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  tenant_id        UUID         NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
  last_read_at     TIMESTAMPTZ,
  joined_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id        UUID         NOT NULL REFERENCES tenants(id)       ON DELETE CASCADE,
  sender_id        UUID         NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  body             TEXT         NOT NULL,
  is_deleted       BOOLEAN      NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 2. Additive columns (idempotent) ─────────────────────────────────────

-- Denormalized last-message pointer on conversations.
-- Maintained by trg_messages_after_insert (below). Lets the thread list
-- and unread-count queries avoid scanning all rows in `messages`.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_at         TIMESTAMPTZ;
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_preview    TEXT;
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_sender_id  UUID REFERENCES users(id) ON DELETE SET NULL;

-- 1:1 conversation uniqueness key. NULL for groups; set to
-- LEAST(uid_a, uid_b) || '/' || GREATEST(uid_a, uid_b) for direct messages.
-- Combined with the unique partial index below, two simultaneous
-- findOrCreate1on1 calls collapse to a single conversation.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS pair_key TEXT;

-- Server-side idempotency. Clients send a stable UUID per send attempt;
-- a retry on a flaky connection no-ops at the unique index instead of
-- creating a duplicate message row.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS client_uuid UUID;

-- Typed messages. 'user' = human-authored, 'system' = generated (e.g.
-- attendance notifications). The UI can render system messages as
-- inline cards instead of chat bubbles; metadata carries the structured
-- payload that originally produced the message.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'user';
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Body length + non-empty constraints. Guarded by DO blocks because
-- ADD CONSTRAINT has no IF NOT EXISTS form.
DO $$ BEGIN
  ALTER TABLE messages
    ADD CONSTRAINT messages_body_length_chk
    CHECK (length(body) BETWEEN 1 AND 4000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE messages
    ADD CONSTRAINT messages_kind_chk
    CHECK (kind IN ('user', 'system'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Indexes ───────────────────────────────────────────────────────────

-- Thread fetch + last-message scan. Partial on is_deleted=false because
-- every read path filters deleted messages out.
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON messages (conversation_id, created_at DESC)
  WHERE is_deleted = false;

-- Tenant scoping fallback (rare; admin / cross-thread queries).
CREATE INDEX IF NOT EXISTS idx_messages_tenant
  ON messages (tenant_id);

-- "What threads is this user in?" — the conversation list's first hop.
CREATE INDEX IF NOT EXISTS idx_cp_user
  ON conversation_participants (user_id, tenant_id);

-- "Who's in this thread?" — second hop for participant profile lookup.
CREATE INDEX IF NOT EXISTS idx_cp_conv
  ON conversation_participants (conversation_id);

-- Sorted thread list. NULLS LAST keeps brand-new empty conversations at
-- the bottom instead of jumping above active ones.
CREATE INDEX IF NOT EXISTS idx_conv_tenant_last_msg
  ON conversations (tenant_id, last_message_at DESC NULLS LAST);

-- 1:1 race fix. Two concurrent INSERTs with the same pair_key collide
-- here; the loser falls back to a SELECT.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_pair_key
  ON conversations (tenant_id, pair_key)
  WHERE pair_key IS NOT NULL;

-- Idempotent send. Scoped per-(conversation, sender) so the client only
-- has to generate a UUID unique within its own session.
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_client_uuid
  ON messages (conversation_id, sender_id, client_uuid)
  WHERE client_uuid IS NOT NULL;

-- ── 4. Participant predicate (SECURITY DEFINER) ──────────────────────────
-- Used by RLS policies on conversations and messages. SECURITY DEFINER
-- bypasses RLS on conversation_participants when called from a policy,
-- which is what avoids infinite recursion (RLS on messages → checks
-- participants → which has its own RLS → ...).
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = conv_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_conversation_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_conversation_participant(UUID) TO authenticated;

-- ── 5. RLS ───────────────────────────────────────────────────────────────

ALTER TABLE conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                   ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so the migration stays idempotent on re-run.
DROP POLICY IF EXISTS "conv_select"            ON conversations;
DROP POLICY IF EXISTS "conv_insert"            ON conversations;
DROP POLICY IF EXISTS "conv_update"            ON conversations;
DROP POLICY IF EXISTS "cp_select"              ON conversation_participants;
DROP POLICY IF EXISTS "cp_insert"              ON conversation_participants;
DROP POLICY IF EXISTS "cp_update_self"         ON conversation_participants;
DROP POLICY IF EXISTS "cp_delete_self"         ON conversation_participants;
DROP POLICY IF EXISTS "msg_select"             ON messages;
DROP POLICY IF EXISTS "msg_insert"             ON messages;
DROP POLICY IF EXISTS "msg_update_sender"      ON messages;

-- Conversations: visible to participants; insertable by the creator
-- inside their own tenant; updatable (title rename) by participants.
CREATE POLICY "conv_select" ON conversations
  FOR SELECT USING (is_conversation_participant(id));

CREATE POLICY "conv_insert" ON conversations
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "conv_update" ON conversations
  FOR UPDATE USING (is_conversation_participant(id));

-- Participants: visible to fellow participants. Inserts allow either
-- (a) the user adding themselves to a thread in their tenant, or
-- (b) an existing participant adding others. Updates and deletes are
-- restricted to the row's own user (e.g. last_read_at, leaving).
CREATE POLICY "cp_select" ON conversation_participants
  FOR SELECT USING (is_conversation_participant(conversation_id));

CREATE POLICY "cp_insert" ON conversation_participants
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR is_conversation_participant(conversation_id)
    )
  );

CREATE POLICY "cp_update_self" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "cp_delete_self" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- Messages: visible to thread participants. Sender must be the calling
-- user and a participant. Edits/soft-deletes restricted to the sender.
CREATE POLICY "msg_select" ON messages
  FOR SELECT USING (is_conversation_participant(conversation_id));

CREATE POLICY "msg_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND is_conversation_participant(conversation_id)
  );

CREATE POLICY "msg_update_sender" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- ── 6. Last-message denorm trigger ───────────────────────────────────────
-- Keeps conversations.last_message_* in sync with the newest non-deleted
-- message. AFTER INSERT covers the hot path (sending). Soft-deleting the
-- newest message will leave a stale preview until the next send — that's
-- acceptable; a stricter trigger on UPDATE would add write amplification
-- on every is_deleted toggle.
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at        = NEW.created_at,
    last_message_preview   = LEFT(NEW.body, 200),
    last_message_sender_id = NEW.sender_id
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_after_insert ON messages;
CREATE TRIGGER trg_messages_after_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- ── 7. Backfill ──────────────────────────────────────────────────────────

-- Populate last_message_* for conversations that existed before this
-- migration. DISTINCT ON picks the newest non-deleted message per thread.
UPDATE conversations c
SET
  last_message_at        = m.created_at,
  last_message_preview   = LEFT(m.body, 200),
  last_message_sender_id = m.sender_id
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id, created_at, body, sender_id
  FROM messages
  WHERE is_deleted = false
  ORDER BY conversation_id, created_at DESC
) m
WHERE c.id = m.conversation_id
  AND c.last_message_at IS NULL;

-- Populate pair_key for existing 1:1 conversations (exactly two
-- participants, no group title). If duplicates exist from the historical
-- race, only the OLDEST conversation in each pair gets the key — the
-- unique index then forces all future find-or-create lookups onto the
-- canonical thread. Surviving duplicates remain accessible via direct
-- link but stop accruing new traffic.
WITH pairs AS (
  SELECT
    cp.conversation_id,
    string_agg(cp.user_id::text, '/' ORDER BY cp.user_id::text) AS pair_key
  FROM conversation_participants cp
  GROUP BY cp.conversation_id
  HAVING COUNT(*) = 2
),
ranked AS (
  SELECT
    p.conversation_id,
    p.pair_key,
    ROW_NUMBER() OVER (PARTITION BY p.pair_key ORDER BY c.created_at) AS rn
  FROM pairs p
  JOIN conversations c ON c.id = p.conversation_id
  WHERE c.title IS NULL
)
UPDATE conversations c
SET pair_key = r.pair_key
FROM ranked r
WHERE c.id = r.conversation_id
  AND r.rn = 1
  AND c.pair_key IS NULL;
