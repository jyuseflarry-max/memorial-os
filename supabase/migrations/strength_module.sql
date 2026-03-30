-- ============================================================
-- STRENGTH & CONDITIONING MASTER MODULE — Database Migration
-- Run this in your Supabase SQL Editor (Database → SQL Editor)
--
-- REQUIRED ENV VAR: Set ENCRYPTION_KEY in Vercel/local .env.local
--   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
--
-- PRIVACY MODEL:
--   - strength_biometrics: DOB and body weight stored AES-256-GCM encrypted
--   - strength_benchmark_pool: NO tenant_id, NO player_id, NO names — safe for cross-tenant aggregation
-- ============================================================

-- ── 1. Player Biometrics (PII-encrypted) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS strength_biometrics (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  player_id      UUID        NOT NULL REFERENCES players(id)  ON DELETE CASCADE,
  biological_sex TEXT        CHECK (biological_sex IN ('Male', 'Female')),
  dob_enc        TEXT,       -- AES-256-GCM encrypted ISO date string (YYYY-MM-DD)
  bw_enc         TEXT,       -- AES-256-GCM encrypted numeric string (lbs)
  updated_at     TIMESTAMPTZ DEFAULT now(),
  updated_by     UUID        REFERENCES users(id),
  UNIQUE (tenant_id, player_id)
);

-- ── 2. Facility Inventory ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strength_inventory (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  equipment_key  TEXT        NOT NULL,
  available      BOOLEAN     NOT NULL DEFAULT false,
  quantity       INTEGER     DEFAULT 1,
  notes          TEXT,
  UNIQUE (tenant_id, equipment_key)
);

-- ── 3. Exercise Library (global seed + tenant custom) ─────────────────────
CREATE TABLE IF NOT EXISTS strength_exercises (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL
                               CHECK (category IN ('compound','olympic','isolation','core','conditioning','mobility')),
  primary_muscles  TEXT[]      NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[]     NOT NULL DEFAULT '{}',
  equipment_keys   TEXT[]      NOT NULL DEFAULT '{}',
  demo_video_url   TEXT,
  coaching_cues    TEXT,
  is_primary_lift  BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── 4. Lift Records (replaces maxes table) ────────────────────────────────
CREATE TABLE IF NOT EXISTS strength_lifts (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID        NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  player_id               UUID        NOT NULL REFERENCES players(id)  ON DELETE CASCADE,
  exercise_id             UUID        NOT NULL REFERENCES strength_exercises(id),
  weight_lbs              NUMERIC     NOT NULL,
  reps                    INTEGER     NOT NULL DEFAULT 1,
  -- Epley formula: 1RM estimate stored for fast leaderboard queries
  estimated_1rm           NUMERIC     GENERATED ALWAYS AS (
    CASE WHEN reps = 1 THEN weight_lbs ELSE weight_lbs * (1 + reps::NUMERIC / 30) END
  ) STORED,
  tempo                   TEXT,                    -- e.g. '2-0-X-1'
  is_verified             BOOLEAN     DEFAULT false,
  verified_by             UUID        REFERENCES users(id),
  verification_video_url  TEXT,
  recorded_at             TIMESTAMPTZ DEFAULT now(),
  recorded_by             UUID        REFERENCES users(id),
  session_notes           TEXT
);

-- ── 5. Daily Readiness Scores ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strength_readiness (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID    NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  player_id    UUID    NOT NULL REFERENCES players(id)  ON DELETE CASCADE,
  score_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT    NOT NULL CHECK (status IN ('green','yellow','red')),
  sleep_hours  NUMERIC CHECK (sleep_hours BETWEEN 0 AND 24),
  soreness     INTEGER CHECK (soreness BETWEEN 1 AND 10),
  energy       INTEGER CHECK (energy BETWEEN 1 AND 10),
  notes        TEXT,
  UNIQUE (tenant_id, player_id, score_date)
);

-- ── 6. S&C Programs (microcycle planning) ────────────────────────────────
CREATE TABLE IF NOT EXISTS strength_programs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  weeks       INTEGER     NOT NULL DEFAULT 4,
  phase       TEXT        CHECK (phase IN ('accumulation','intensification','realization','deload')),
  blocks      JSONB       NOT NULL DEFAULT '[]',
  created_by  UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 7. Anonymous Benchmark Pool (cross-tenant, ZERO PII) ────────────────
-- PRIVACY: No tenant_id, player_id, names, or exact dates stored here.
-- Only age bucket (floor year), sex, SWR, and truncated month.
CREATE TABLE IF NOT EXISTS strength_benchmark_pool (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id    UUID    NOT NULL REFERENCES strength_exercises(id),
  biological_sex TEXT    CHECK (biological_sex IN ('Male','Female')),
  age_years      INTEGER NOT NULL,     -- floor(actual age) — no exact DOB
  swr            NUMERIC NOT NULL,     -- lift_weight / body_weight
  recorded_month DATE    NOT NULL      -- truncated to 1st of month, no exact date
  -- Intentionally NO tenant_id, player_id, or identifying fields
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sc_lifts_player    ON strength_lifts(tenant_id, player_id);
CREATE INDEX IF NOT EXISTS idx_sc_lifts_exercise  ON strength_lifts(tenant_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_sc_lifts_recorded  ON strength_lifts(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_readiness_date  ON strength_readiness(tenant_id, player_id, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_sc_benchmark       ON strength_benchmark_pool(exercise_id, biological_sex, age_years);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE strength_biometrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_exercises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_lifts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_readiness     ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_programs      ENABLE ROW LEVEL SECURITY;
-- benchmark_pool: NO RLS — intentionally readable cross-tenant for percentile queries

-- ── Global Exercise Seed (90+ exercises) ────────────────────────────────
-- tenant_id = NULL denotes global exercises (read-only from tenant perspective)
INSERT INTO strength_exercises (name, category, primary_muscles, secondary_muscles, equipment_keys, is_primary_lift) VALUES
-- COMPOUND LOWER
('Back Squat',           'compound',    ARRAY['Quadriceps','Glutes'],               ARRAY['Hamstrings','Core','Lower Back'],       ARRAY['bar_45','bar_35','rack'],          true),
('Front Squat',          'compound',    ARRAY['Quadriceps'],                        ARRAY['Core','Upper Back','Glutes'],           ARRAY['bar_45','bar_35','rack'],          false),
('Conventional Deadlift','compound',    ARRAY['Hamstrings','Glutes','Lower Back'],   ARRAY['Quadriceps','Traps','Forearms'],        ARRAY['bar_45','bar_35'],                 true),
('Romanian Deadlift',    'compound',    ARRAY['Hamstrings','Glutes'],               ARRAY['Lower Back','Core'],                   ARRAY['bar_45','bar_35'],                 false),
('Sumo Deadlift',        'compound',    ARRAY['Glutes','Quadriceps'],               ARRAY['Hamstrings','Adductors','Lower Back'],  ARRAY['bar_45','bar_35'],                 false),
('Trap Bar Deadlift',    'compound',    ARRAY['Quadriceps','Glutes','Hamstrings'],   ARRAY['Traps','Forearms'],                    ARRAY['trap_bar'],                        false),
('Box Squat',            'compound',    ARRAY['Glutes','Hamstrings'],               ARRAY['Quadriceps','Core'],                   ARRAY['bar_45','bar_35','rack','plyo_boxes'], false),
('Pause Squat',          'compound',    ARRAY['Quadriceps','Glutes'],               ARRAY['Core','Lower Back'],                   ARRAY['bar_45','bar_35','rack'],          false),
('Bulgarian Split Squat','compound',    ARRAY['Quadriceps','Glutes'],               ARRAY['Hamstrings','Core'],                   ARRAY['dumbbell_set','bar_45'],           false),
('Leg Press',            'compound',    ARRAY['Quadriceps'],                        ARRAY['Glutes','Hamstrings'],                 ARRAY['leg_press_machine'],               false),
('Hip Thrust',           'compound',    ARRAY['Glutes'],                            ARRAY['Hamstrings','Core'],                   ARRAY['bar_45','bench_flat'],             false),
('Good Morning',         'compound',    ARRAY['Hamstrings','Lower Back'],           ARRAY['Glutes','Core'],                       ARRAY['bar_45','bar_35'],                 false),
-- OLYMPIC
('Power Clean',          'olympic',     ARRAY['Hamstrings','Glutes','Traps'],        ARRAY['Quadriceps','Shoulders','Core'],        ARRAY['bar_45','bar_35'],                 true),
('Hang Power Clean',     'olympic',     ARRAY['Hamstrings','Traps','Shoulders'],     ARRAY['Core','Glutes'],                       ARRAY['bar_45','bar_35'],                 false),
('Squat Clean',          'olympic',     ARRAY['Hamstrings','Glutes','Quadriceps'],   ARRAY['Traps','Shoulders','Core'],            ARRAY['bar_45','bar_35'],                 false),
('Power Snatch',         'olympic',     ARRAY['Hamstrings','Glutes','Shoulders'],    ARRAY['Traps','Core','Quadriceps'],           ARRAY['bar_45','bar_35'],                 false),
('Hang Power Snatch',    'olympic',     ARRAY['Hamstrings','Traps'],                ARRAY['Shoulders','Core'],                    ARRAY['bar_45','bar_35'],                 false),
('Push Jerk',            'olympic',     ARRAY['Shoulders','Quadriceps'],            ARRAY['Triceps','Core','Glutes'],             ARRAY['bar_45','bar_35'],                 false),
('Split Jerk',           'olympic',     ARRAY['Shoulders','Quadriceps','Glutes'],   ARRAY['Triceps','Core'],                      ARRAY['bar_45','bar_35'],                 false),
('Push Press',           'olympic',     ARRAY['Shoulders','Quadriceps'],            ARRAY['Triceps','Core'],                      ARRAY['bar_45','bar_35'],                 false),
-- COMPOUND UPPER PUSH
('Bench Press',          'compound',    ARRAY['Chest'],                             ARRAY['Triceps','Shoulders'],                 ARRAY['bar_45','bar_35','bench_flat'],    true),
('Incline Bench Press',  'compound',    ARRAY['Chest','Shoulders'],                 ARRAY['Triceps'],                             ARRAY['bar_45','bar_35','bench_incline'], false),
('Close Grip Bench',     'compound',    ARRAY['Triceps','Chest'],                   ARRAY['Shoulders'],                           ARRAY['bar_45','bench_flat'],             false),
('Overhead Press',       'compound',    ARRAY['Shoulders'],                         ARRAY['Triceps','Core','Traps'],              ARRAY['bar_45','bar_35'],                 false),
('Dumbbell Bench Press', 'compound',    ARRAY['Chest'],                             ARRAY['Triceps','Shoulders'],                 ARRAY['dumbbell_set','bench_flat'],       false),
('Dumbbell Shoulder Press','compound',  ARRAY['Shoulders'],                         ARRAY['Triceps','Core'],                      ARRAY['dumbbell_set'],                    false),
('Dips',                 'compound',    ARRAY['Chest','Triceps'],                   ARRAY['Shoulders'],                           ARRAY['dip_station'],                     false),
-- COMPOUND UPPER PULL
('Barbell Row',          'compound',    ARRAY['Upper Back','Lats'],                 ARRAY['Biceps','Rear Delts','Core'],          ARRAY['bar_45','bar_35'],                 false),
('Pendlay Row',          'compound',    ARRAY['Upper Back','Lats'],                 ARRAY['Biceps','Core','Hamstrings'],          ARRAY['bar_45','bar_35'],                 false),
('Dumbbell Row',         'compound',    ARRAY['Lats','Upper Back'],                 ARRAY['Biceps','Rear Delts'],                 ARRAY['dumbbell_set'],                    false),
('Pull-Up',              'compound',    ARRAY['Lats','Upper Back'],                 ARRAY['Biceps','Core'],                      ARRAY['pull_up_bar'],                     false),
('Chin-Up',              'compound',    ARRAY['Lats','Biceps'],                     ARRAY['Upper Back','Core'],                  ARRAY['pull_up_bar'],                     false),
('Lat Pulldown',         'compound',    ARRAY['Lats'],                              ARRAY['Biceps','Upper Back'],                ARRAY['cable_machine'],                   false),
('Cable Row',            'compound',    ARRAY['Upper Back','Lats'],                 ARRAY['Biceps','Rear Delts'],                 ARRAY['cable_machine'],                   false),
('T-Bar Row',            'compound',    ARRAY['Upper Back','Lats'],                 ARRAY['Biceps','Lower Back'],                ARRAY['bar_45','landmine_attachment'],    false),
('Face Pull',            'isolation',   ARRAY['Rear Delts','Rotator Cuff'],         ARRAY['Upper Back','Biceps'],                ARRAY['cable_machine'],                   false),
('Shrug',                'isolation',   ARRAY['Traps'],                             ARRAY['Forearms'],                           ARRAY['bar_45','dumbbell_set'],           false),
-- ISOLATION
('Bicep Curl',           'isolation',   ARRAY['Biceps'],                            ARRAY['Forearms'],                           ARRAY['dumbbell_set','ez_curl_bar'],      false),
('Hammer Curl',          'isolation',   ARRAY['Biceps','Brachialis'],               ARRAY['Forearms'],                           ARRAY['dumbbell_set'],                    false),
('Tricep Extension',     'isolation',   ARRAY['Triceps'],                           ARRAY[]::TEXT[],                             ARRAY['cable_machine','dumbbell_set'],    false),
('Skullcrushers',        'isolation',   ARRAY['Triceps'],                           ARRAY['Chest'],                              ARRAY['ez_curl_bar','bench_flat'],        false),
('Lateral Raise',        'isolation',   ARRAY['Shoulders'],                         ARRAY[]::TEXT[],                             ARRAY['dumbbell_set','cable_machine'],    false),
('Front Raise',          'isolation',   ARRAY['Shoulders'],                         ARRAY['Chest'],                              ARRAY['dumbbell_set'],                    false),
('Rear Delt Fly',        'isolation',   ARRAY['Rear Delts'],                        ARRAY['Upper Back'],                         ARRAY['dumbbell_set','cable_machine'],    false),
('Chest Fly',            'isolation',   ARRAY['Chest'],                             ARRAY['Shoulders'],                          ARRAY['dumbbell_set','cable_machine'],    false),
('Calf Raise',           'isolation',   ARRAY['Calves'],                            ARRAY[]::TEXT[],                             ARRAY['bar_45'],                          false),
('Nordic Curl',          'isolation',   ARRAY['Hamstrings'],                        ARRAY['Glutes','Core'],                      ARRAY['nordic_machine','bands'],          false),
('Glute Bridge',         'isolation',   ARRAY['Glutes','Hamstrings'],               ARRAY['Core','Lower Back'],                  ARRAY['bar_45','dumbbell_set'],           false),
('Leg Curl',             'isolation',   ARRAY['Hamstrings'],                        ARRAY['Calves'],                             ARRAY['leg_press_machine'],               false),
('Leg Extension',        'isolation',   ARRAY['Quadriceps'],                        ARRAY[]::TEXT[],                             ARRAY['leg_press_machine'],               false),
-- CORE
('Plank',                'core',        ARRAY['Core'],                              ARRAY['Shoulders','Glutes'],                 ARRAY[]::TEXT[],                          false),
('Dead Bug',             'core',        ARRAY['Core'],                              ARRAY['Hip Flexors'],                        ARRAY[]::TEXT[],                          false),
('Pallof Press',         'core',        ARRAY['Core','Obliques'],                   ARRAY['Shoulders'],                          ARRAY['cable_machine','bands'],           false),
('Ab Wheel Rollout',     'core',        ARRAY['Core'],                              ARRAY['Lats','Shoulders'],                   ARRAY['ab_wheel'],                        false),
('Hanging Leg Raise',    'core',        ARRAY['Core','Hip Flexors'],                ARRAY['Lats'],                               ARRAY['pull_up_bar'],                     false),
('Back Extension',       'core',        ARRAY['Lower Back','Glutes'],               ARRAY['Hamstrings','Core'],                  ARRAY['ghd_machine'],                     false),
('Bird Dog',             'core',        ARRAY['Core','Glutes'],                     ARRAY['Lower Back','Shoulders'],             ARRAY[]::TEXT[],                          false),
('Landmine Rotation',    'core',        ARRAY['Obliques','Core'],                   ARRAY['Shoulders','Hips'],                   ARRAY['bar_45','landmine_attachment'],    false),
('Copenhagen Plank',     'core',        ARRAY['Adductors','Core'],                  ARRAY['Glutes','Obliques'],                  ARRAY[]::TEXT[],                          false),
('Weighted Sit-Up',      'core',        ARRAY['Core'],                              ARRAY['Hip Flexors'],                        ARRAY['med_balls','dumbbell_set'],        false),
-- CONDITIONING / PLYOMETRIC
('Sled Push',            'conditioning',ARRAY['Quadriceps','Glutes'],               ARRAY['Core','Calves','Shoulders'],           ARRAY['sled'],                            false),
('Sled Pull',            'conditioning',ARRAY['Hamstrings','Glutes','Upper Back'],   ARRAY['Core','Biceps'],                      ARRAY['sled'],                            false),
('Box Jump',             'conditioning',ARRAY['Quadriceps','Glutes'],               ARRAY['Hamstrings','Calves','Core'],          ARRAY['plyo_boxes'],                      false),
('Broad Jump',           'conditioning',ARRAY['Quadriceps','Glutes','Hamstrings'],   ARRAY['Core','Calves'],                      ARRAY[]::TEXT[],                          false),
('Depth Jump',           'conditioning',ARRAY['Quadriceps','Glutes'],               ARRAY['Hamstrings','Calves'],                ARRAY['plyo_boxes'],                      false),
('Med Ball Slam',        'conditioning',ARRAY['Core','Shoulders'],                  ARRAY['Lats','Hamstrings'],                  ARRAY['med_balls'],                       false),
('Med Ball Chest Pass',  'conditioning',ARRAY['Chest','Triceps'],                   ARRAY['Shoulders','Core'],                   ARRAY['med_balls'],                       false),
('Battle Ropes',         'conditioning',ARRAY['Shoulders','Core'],                  ARRAY['Biceps','Forearms'],                  ARRAY['battle_ropes'],                    false),
('Kettlebell Swing',     'conditioning',ARRAY['Glutes','Hamstrings'],               ARRAY['Core','Shoulders','Lats'],            ARRAY['kettlebell_set'],                  false),
('Kettlebell Clean',     'conditioning',ARRAY['Glutes','Hamstrings','Shoulders'],    ARRAY['Core','Traps'],                       ARRAY['kettlebell_set'],                  false),
('Burpee Box Jump',      'conditioning',ARRAY['Full Body'],                         ARRAY['Core','Cardio'],                      ARRAY['plyo_boxes'],                      false),
('Sprint',               'conditioning',ARRAY['Quadriceps','Hamstrings','Glutes'],   ARRAY['Core','Calves'],                      ARRAY[]::TEXT[],                          false),
-- MOBILITY / ACCESSORY
('Single Leg RDL',       'mobility',    ARRAY['Hamstrings','Glutes'],               ARRAY['Core','Lower Back'],                  ARRAY['dumbbell_set','kettlebell_set'],   false),
('Reverse Lunge',        'compound',    ARRAY['Quadriceps','Glutes'],               ARRAY['Hamstrings','Core'],                  ARRAY['dumbbell_set','bar_45'],           false),
('Lateral Lunge',        'compound',    ARRAY['Adductors','Quadriceps','Glutes'],   ARRAY['Core','Hamstrings'],                  ARRAY['dumbbell_set'],                    false),
('Step-Up',              'compound',    ARRAY['Quadriceps','Glutes'],               ARRAY['Hamstrings','Core'],                  ARRAY['plyo_boxes','dumbbell_set'],       false),
('Hip Flexor Stretch',   'mobility',    ARRAY['Hip Flexors'],                       ARRAY['Quadriceps'],                         ARRAY[]::TEXT[],                          false),
('Pigeon Pose',          'mobility',    ARRAY['Glutes','Hip Flexors'],              ARRAY['Quadriceps'],                         ARRAY[]::TEXT[],                          false),
('Wall Ankle Mob',       'mobility',    ARRAY['Calves','Ankles'],                   ARRAY[]::TEXT[],                             ARRAY[]::TEXT[],                          false),
('Thoracic Extension',   'mobility',    ARRAY['Thoracic Spine'],                    ARRAY['Shoulders'],                          ARRAY['foam_roller'],                     false),
('Band Pull-Apart',      'mobility',    ARRAY['Rear Delts','Upper Back'],           ARRAY['Rotator Cuff'],                       ARRAY['bands'],                           false),
('Inchworm',             'mobility',    ARRAY['Hamstrings','Core'],                 ARRAY['Shoulders','Calves'],                 ARRAY[]::TEXT[],                          false),
('World''s Greatest Stretch','mobility',ARRAY['Hip Flexors','Thoracic Spine'],      ARRAY['Hamstrings','Shoulders'],             ARRAY[]::TEXT[],                          false),
('Ankle Circle',         'mobility',    ARRAY['Ankles'],                            ARRAY[]::TEXT[],                             ARRAY[]::TEXT[],                          false),
('Foam Roll Quads',      'mobility',    ARRAY['Quadriceps'],                        ARRAY[]::TEXT[],                             ARRAY['foam_roller'],                     false),
('Foam Roll IT Band',    'mobility',    ARRAY['IT Band','Quadriceps'],              ARRAY[]::TEXT[],                             ARRAY['foam_roller'],                     false)
ON CONFLICT DO NOTHING;
