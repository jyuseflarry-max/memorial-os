-- ============================================================
-- STRENGTH SEED — Muscle Groups, Equipment & Exercise Library
-- Run AFTER strength_library_tables.sql
-- Idempotent: safe to run multiple times
-- ============================================================

-- ── Schema fixes: make tenant_id nullable so global records can exist ─────
ALTER TABLE strength_muscle_groups ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE strength_equipment     ALTER COLUMN tenant_id DROP NOT NULL;

-- ── RLS: allow reading global (tenant_id IS NULL) rows ────────────────────
DROP POLICY IF EXISTS "tenant_isolation" ON strength_muscle_groups;
CREATE POLICY "read_global_and_tenant" ON strength_muscle_groups
  FOR SELECT USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "tenant_write" ON strength_muscle_groups
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_update" ON strength_muscle_groups
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_delete" ON strength_muscle_groups
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "tenant_isolation" ON strength_equipment;
CREATE POLICY "read_global_and_tenant" ON strength_equipment
  FOR SELECT USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "tenant_write" ON strength_equipment
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_update" ON strength_equipment
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "tenant_delete" ON strength_equipment
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ── Seed data (idempotent DO block) ───────────────────────────────────────
DO $$
DECLARE
  -- Muscle Group IDs
  mg_chest        UUID; mg_upper_back  UUID; mg_lats         UUID;
  mg_shoulders    UUID; mg_biceps      UUID; mg_triceps      UUID;
  mg_traps        UUID; mg_forearms    UUID; mg_rhomboids    UUID;
  mg_quads        UUID; mg_hamstrings  UUID; mg_glutes       UUID;
  mg_calves       UUID; mg_hip_flexors UUID; mg_adductors    UUID;
  mg_abs          UUID; mg_obliques    UUID; mg_lower_back   UUID;
  mg_full_body    UUID; mg_rear_delts  UUID;

  -- Equipment IDs
  eq_barbell      UUID; eq_dumbbells   UUID; eq_kettlebell   UUID;
  eq_plates       UUID; eq_ez_bar      UUID; eq_trap_bar     UUID;
  eq_power_rack   UUID; eq_smith       UUID; eq_pullup_bar   UUID;
  eq_dip_bars     UUID; eq_cable       UUID; eq_leg_press    UUID;
  eq_leg_ext      UUID; eq_leg_curl    UUID; eq_hack_squat   UUID;
  eq_flat_bench   UUID; eq_adj_bench   UUID; eq_bands        UUID;
  eq_med_ball     UUID; eq_ab_wheel    UUID; eq_foam_roller  UUID;
  eq_plyo_box     UUID; eq_sled        UUID; eq_battle_ropes UUID;
  eq_trx          UUID; eq_jump_rope   UUID; eq_landmine     UUID;
  eq_ghd          UUID; eq_bodyweight  UUID;

BEGIN
  -- ── Muscle Groups ──────────────────────────────────────────────────────
  SELECT id INTO mg_chest       FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Chest';
  IF mg_chest IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Chest','upper') RETURNING id INTO mg_chest; END IF;

  SELECT id INTO mg_upper_back  FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Upper Back';
  IF mg_upper_back IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Upper Back','upper') RETURNING id INTO mg_upper_back; END IF;

  SELECT id INTO mg_lats        FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Lats';
  IF mg_lats IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Lats','upper') RETURNING id INTO mg_lats; END IF;

  SELECT id INTO mg_shoulders   FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Shoulders';
  IF mg_shoulders IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Shoulders','upper') RETURNING id INTO mg_shoulders; END IF;

  SELECT id INTO mg_rear_delts  FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Rear Delts';
  IF mg_rear_delts IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Rear Delts','upper') RETURNING id INTO mg_rear_delts; END IF;

  SELECT id INTO mg_biceps      FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Biceps';
  IF mg_biceps IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Biceps','upper') RETURNING id INTO mg_biceps; END IF;

  SELECT id INTO mg_triceps     FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Triceps';
  IF mg_triceps IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Triceps','upper') RETURNING id INTO mg_triceps; END IF;

  SELECT id INTO mg_traps       FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Traps';
  IF mg_traps IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Traps','upper') RETURNING id INTO mg_traps; END IF;

  SELECT id INTO mg_forearms    FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Forearms';
  IF mg_forearms IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Forearms','upper') RETURNING id INTO mg_forearms; END IF;

  SELECT id INTO mg_rhomboids   FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Rhomboids';
  IF mg_rhomboids IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Rhomboids','upper') RETURNING id INTO mg_rhomboids; END IF;

  SELECT id INTO mg_quads       FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Quadriceps';
  IF mg_quads IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Quadriceps','lower') RETURNING id INTO mg_quads; END IF;

  SELECT id INTO mg_hamstrings  FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Hamstrings';
  IF mg_hamstrings IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Hamstrings','lower') RETURNING id INTO mg_hamstrings; END IF;

  SELECT id INTO mg_glutes      FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Glutes';
  IF mg_glutes IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Glutes','lower') RETURNING id INTO mg_glutes; END IF;

  SELECT id INTO mg_calves      FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Calves';
  IF mg_calves IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Calves','lower') RETURNING id INTO mg_calves; END IF;

  SELECT id INTO mg_hip_flexors FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Hip Flexors';
  IF mg_hip_flexors IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Hip Flexors','lower') RETURNING id INTO mg_hip_flexors; END IF;

  SELECT id INTO mg_adductors   FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Adductors';
  IF mg_adductors IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Adductors','lower') RETURNING id INTO mg_adductors; END IF;

  SELECT id INTO mg_abs         FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Abs';
  IF mg_abs IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Abs','core') RETURNING id INTO mg_abs; END IF;

  SELECT id INTO mg_obliques    FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Obliques';
  IF mg_obliques IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Obliques','core') RETURNING id INTO mg_obliques; END IF;

  SELECT id INTO mg_lower_back  FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Lower Back';
  IF mg_lower_back IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Lower Back','core') RETURNING id INTO mg_lower_back; END IF;

  SELECT id INTO mg_full_body   FROM strength_muscle_groups WHERE tenant_id IS NULL AND name = 'Full Body';
  IF mg_full_body IS NULL THEN INSERT INTO strength_muscle_groups (tenant_id,name,body_region) VALUES (NULL,'Full Body','full_body') RETURNING id INTO mg_full_body; END IF;

  -- ── Equipment ──────────────────────────────────────────────────────────
  SELECT id INTO eq_barbell     FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Barbell';
  IF eq_barbell IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Barbell') RETURNING id INTO eq_barbell; END IF;

  SELECT id INTO eq_dumbbells   FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Dumbbells';
  IF eq_dumbbells IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Dumbbells') RETURNING id INTO eq_dumbbells; END IF;

  SELECT id INTO eq_kettlebell  FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Kettlebell';
  IF eq_kettlebell IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Kettlebell') RETURNING id INTO eq_kettlebell; END IF;

  SELECT id INTO eq_plates      FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Weight Plates';
  IF eq_plates IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Weight Plates') RETURNING id INTO eq_plates; END IF;

  SELECT id INTO eq_ez_bar      FROM strength_equipment WHERE tenant_id IS NULL AND name = 'EZ Curl Bar';
  IF eq_ez_bar IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'EZ Curl Bar') RETURNING id INTO eq_ez_bar; END IF;

  SELECT id INTO eq_trap_bar    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Trap Bar / Hex Bar';
  IF eq_trap_bar IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Trap Bar / Hex Bar') RETURNING id INTO eq_trap_bar; END IF;

  SELECT id INTO eq_power_rack  FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Power Rack';
  IF eq_power_rack IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Power Rack') RETURNING id INTO eq_power_rack; END IF;

  SELECT id INTO eq_smith       FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Smith Machine';
  IF eq_smith IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Smith Machine') RETURNING id INTO eq_smith; END IF;

  SELECT id INTO eq_pullup_bar  FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Pull-up Bar';
  IF eq_pullup_bar IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Pull-up Bar') RETURNING id INTO eq_pullup_bar; END IF;

  SELECT id INTO eq_dip_bars    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Dip Bars';
  IF eq_dip_bars IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Dip Bars') RETURNING id INTO eq_dip_bars; END IF;

  SELECT id INTO eq_cable       FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Cable Machine';
  IF eq_cable IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Cable Machine') RETURNING id INTO eq_cable; END IF;

  SELECT id INTO eq_leg_press   FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Leg Press Machine';
  IF eq_leg_press IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Leg Press Machine') RETURNING id INTO eq_leg_press; END IF;

  SELECT id INTO eq_leg_ext     FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Leg Extension Machine';
  IF eq_leg_ext IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Leg Extension Machine') RETURNING id INTO eq_leg_ext; END IF;

  SELECT id INTO eq_leg_curl    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Leg Curl Machine';
  IF eq_leg_curl IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Leg Curl Machine') RETURNING id INTO eq_leg_curl; END IF;

  SELECT id INTO eq_hack_squat  FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Hack Squat Machine';
  IF eq_hack_squat IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Hack Squat Machine') RETURNING id INTO eq_hack_squat; END IF;

  SELECT id INTO eq_flat_bench  FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Flat Bench';
  IF eq_flat_bench IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Flat Bench') RETURNING id INTO eq_flat_bench; END IF;

  SELECT id INTO eq_adj_bench   FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Adjustable Bench';
  IF eq_adj_bench IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Adjustable Bench') RETURNING id INTO eq_adj_bench; END IF;

  SELECT id INTO eq_bands       FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Resistance Bands';
  IF eq_bands IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Resistance Bands') RETURNING id INTO eq_bands; END IF;

  SELECT id INTO eq_med_ball    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Medicine Ball';
  IF eq_med_ball IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Medicine Ball') RETURNING id INTO eq_med_ball; END IF;

  SELECT id INTO eq_ab_wheel    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Ab Wheel';
  IF eq_ab_wheel IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Ab Wheel') RETURNING id INTO eq_ab_wheel; END IF;

  SELECT id INTO eq_foam_roller FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Foam Roller';
  IF eq_foam_roller IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Foam Roller') RETURNING id INTO eq_foam_roller; END IF;

  SELECT id INTO eq_plyo_box    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Plyo Box';
  IF eq_plyo_box IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Plyo Box') RETURNING id INTO eq_plyo_box; END IF;

  SELECT id INTO eq_sled        FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Sled';
  IF eq_sled IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Sled') RETURNING id INTO eq_sled; END IF;

  SELECT id INTO eq_battle_ropes FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Battle Ropes';
  IF eq_battle_ropes IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Battle Ropes') RETURNING id INTO eq_battle_ropes; END IF;

  SELECT id INTO eq_trx         FROM strength_equipment WHERE tenant_id IS NULL AND name = 'TRX / Suspension Trainer';
  IF eq_trx IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'TRX / Suspension Trainer') RETURNING id INTO eq_trx; END IF;

  SELECT id INTO eq_jump_rope   FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Jump Rope';
  IF eq_jump_rope IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Jump Rope') RETURNING id INTO eq_jump_rope; END IF;

  SELECT id INTO eq_landmine    FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Landmine';
  IF eq_landmine IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Landmine') RETURNING id INTO eq_landmine; END IF;

  SELECT id INTO eq_ghd         FROM strength_equipment WHERE tenant_id IS NULL AND name = 'GHD Machine';
  IF eq_ghd IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'GHD Machine') RETURNING id INTO eq_ghd; END IF;

  SELECT id INTO eq_bodyweight  FROM strength_equipment WHERE tenant_id IS NULL AND name = 'Bodyweight';
  IF eq_bodyweight IS NULL THEN INSERT INTO strength_equipment (tenant_id,name) VALUES (NULL,'Bodyweight') RETURNING id INTO eq_bodyweight; END IF;

  -- ── Exercises — Compound ───────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Back Squat') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Back Squat','compound',ARRAY['Quadriceps'],ARRAY['Hamstrings','Glutes','Lower Back'],ARRAY['Barbell','Power Rack'],true,'Bar on traps, chest up, knees track over toes, break parallel, drive hips through at top',mg_quads,ARRAY[mg_hamstrings,mg_glutes,mg_lower_back],ARRAY[eq_barbell,eq_power_rack]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Front Squat') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Front Squat','compound',ARRAY['Quadriceps'],ARRAY['Hamstrings','Glutes','Core'],ARRAY['Barbell','Power Rack'],true,'Elbows high and forward, upright torso, knees track wide',mg_quads,ARRAY[mg_hamstrings,mg_glutes,mg_abs],ARRAY[eq_barbell,eq_power_rack]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Goblet Squat') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Goblet Squat','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Core'],ARRAY['Dumbbell','Kettlebell'],false,'Hold weight at chest, elbows inside knees at bottom, stay upright',mg_quads,ARRAY[mg_glutes,mg_abs],ARRAY[eq_dumbbells,eq_kettlebell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Box Squat') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Box Squat','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Hamstrings'],ARRAY['Barbell','Power Rack','Plyo Box'],false,'Sit back to box, pause briefly, drive through heels',mg_quads,ARRAY[mg_glutes,mg_hamstrings],ARRAY[eq_barbell,eq_power_rack,eq_plyo_box]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Conventional Deadlift') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Conventional Deadlift','compound',ARRAY['Lower Back'],ARRAY['Hamstrings','Glutes','Traps'],ARRAY['Barbell','Weight Plates'],true,'Hips hinge back, neutral spine, bar stays close to body, lock hips and knees simultaneously',mg_lower_back,ARRAY[mg_hamstrings,mg_glutes,mg_traps],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Romanian Deadlift') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Romanian Deadlift','compound',ARRAY['Hamstrings'],ARRAY['Glutes','Lower Back'],ARRAY['Barbell'],false,'Push hips back, soft knee bend, bar slides down thighs, feel stretch in hamstrings before reversing',mg_hamstrings,ARRAY[mg_glutes,mg_lower_back],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Sumo Deadlift') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Sumo Deadlift','compound',ARRAY['Adductors','Quadriceps'],ARRAY['Glutes','Hamstrings'],ARRAY['Barbell','Weight Plates'],false,'Wide stance, toes out, knees push out, vertical torso',mg_adductors,ARRAY[mg_glutes,mg_hamstrings,mg_quads],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Trap Bar Deadlift') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Trap Bar Deadlift','compound',ARRAY['Quadriceps'],ARRAY['Hamstrings','Glutes','Lower Back'],ARRAY['Trap Bar / Hex Bar','Weight Plates'],false,'More upright torso than straight bar, drive floor away',mg_quads,ARRAY[mg_hamstrings,mg_glutes,mg_lower_back],ARRAY[eq_trap_bar,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Bench Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Bench Press','compound',ARRAY['Chest'],ARRAY['Triceps','Shoulders'],ARRAY['Barbell','Flat Bench','Power Rack'],true,'Retract scapulae, bar to lower chest, drive feet into floor, elbows 45–75 degrees',mg_chest,ARRAY[mg_triceps,mg_shoulders],ARRAY[eq_barbell,eq_flat_bench,eq_power_rack]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Incline Bench Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Incline Bench Press','compound',ARRAY['Chest'],ARRAY['Triceps','Shoulders'],ARRAY['Barbell','Adjustable Bench','Power Rack'],false,'30–45 degree incline, bar to upper chest, elbows slightly flared',mg_chest,ARRAY[mg_triceps,mg_shoulders],ARRAY[eq_barbell,eq_adj_bench,eq_power_rack]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dumbbell Bench Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dumbbell Bench Press','compound',ARRAY['Chest'],ARRAY['Triceps','Shoulders'],ARRAY['Dumbbells','Flat Bench'],false,'Greater range of motion than barbell, touch dumbbells at top',mg_chest,ARRAY[mg_triceps,mg_shoulders],ARRAY[eq_dumbbells,eq_flat_bench]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Overhead Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Overhead Press','compound',ARRAY['Shoulders'],ARRAY['Triceps','Traps'],ARRAY['Barbell','Power Rack'],true,'Tight core, bar starts at upper chest, press in a straight line overhead, shrug at top',mg_shoulders,ARRAY[mg_triceps,mg_traps],ARRAY[eq_barbell,eq_power_rack]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dumbbell Overhead Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dumbbell Overhead Press','compound',ARRAY['Shoulders'],ARRAY['Triceps','Traps'],ARRAY['Dumbbells'],false,'Can be done seated or standing, neutral or pronated grip',mg_shoulders,ARRAY[mg_triceps,mg_traps],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Barbell Row') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Barbell Row','compound',ARRAY['Upper Back'],ARRAY['Biceps','Lats','Rhomboids'],ARRAY['Barbell'],true,'Hip hinge ~45 degrees, pull bar to lower ribcage, lead with elbows, squeeze shoulder blades',mg_upper_back,ARRAY[mg_biceps,mg_lats,mg_rhomboids],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dumbbell Row') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dumbbell Row','compound',ARRAY['Lats'],ARRAY['Upper Back','Biceps','Rhomboids'],ARRAY['Dumbbells','Flat Bench'],false,'Brace on bench, pull elbow to hip, keep torso still',mg_lats,ARRAY[mg_upper_back,mg_biceps,mg_rhomboids],ARRAY[eq_dumbbells,eq_flat_bench]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='T-Bar Row') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'T-Bar Row','compound',ARRAY['Upper Back'],ARRAY['Biceps','Lats','Rhomboids'],ARRAY['Barbell','Landmine'],false,'Chest supported or bent-over, pull handles to sternum',mg_upper_back,ARRAY[mg_biceps,mg_lats,mg_rhomboids],ARRAY[eq_barbell,eq_landmine]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Pull-up') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Pull-up','compound',ARRAY['Lats'],ARRAY['Upper Back','Biceps','Rhomboids'],ARRAY['Pull-up Bar'],false,'Pronated grip, dead hang start, drive elbows to hips, chin clears bar',mg_lats,ARRAY[mg_upper_back,mg_biceps,mg_rhomboids],ARRAY[eq_pullup_bar]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Chin-up') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Chin-up','compound',ARRAY['Biceps'],ARRAY['Lats','Upper Back'],ARRAY['Pull-up Bar'],false,'Supinated grip shoulder-width, full range of motion, pause at top',mg_biceps,ARRAY[mg_lats,mg_upper_back],ARRAY[eq_pullup_bar]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hip Thrust') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hip Thrust','compound',ARRAY['Glutes'],ARRAY['Hamstrings'],ARRAY['Barbell','Flat Bench','Weight Plates'],false,'Shoulders on bench, bar across hip crease with pad, drive hips to full extension, squeeze glutes hard at top',mg_glutes,ARRAY[mg_hamstrings],ARRAY[eq_barbell,eq_flat_bench,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dumbbell Hip Thrust') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dumbbell Hip Thrust','compound',ARRAY['Glutes'],ARRAY['Hamstrings'],ARRAY['Dumbbells','Flat Bench'],false,'Dumbbell on hip crease, same cues as barbell version',mg_glutes,ARRAY[mg_hamstrings],ARRAY[eq_dumbbells,eq_flat_bench]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Leg Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Leg Press','compound',ARRAY['Quadriceps'],ARRAY['Hamstrings','Glutes'],ARRAY['Leg Press Machine'],false,'Feet shoulder-width, do not lock knees at top, full range of motion',mg_quads,ARRAY[mg_hamstrings,mg_glutes],ARRAY[eq_leg_press]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hack Squat') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hack Squat','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Hamstrings'],ARRAY['Hack Squat Machine'],false,'Machine supports torso, full depth, drive through heels',mg_quads,ARRAY[mg_glutes,mg_hamstrings],ARRAY[eq_hack_squat]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Barbell Lunge') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Barbell Lunge','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Hamstrings'],ARRAY['Barbell'],false,'Step length lets front shin stay vertical, knee does not track past toes',mg_quads,ARRAY[mg_glutes,mg_hamstrings],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dumbbell Lunge') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dumbbell Lunge','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Hamstrings'],ARRAY['Dumbbells'],false,'Walking or stationary, dumbbells at sides, upright torso',mg_quads,ARRAY[mg_glutes,mg_hamstrings],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Bulgarian Split Squat') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Bulgarian Split Squat','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Hip Flexors'],ARRAY['Dumbbells','Adjustable Bench'],false,'Rear foot elevated on bench, front foot far enough forward, vertical torso',mg_quads,ARRAY[mg_glutes,mg_hip_flexors],ARRAY[eq_dumbbells,eq_adj_bench]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Step-up') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Step-up','compound',ARRAY['Quadriceps'],ARRAY['Glutes','Hamstrings'],ARRAY['Dumbbells','Plyo Box'],false,'Drive through the heel of the working leg, control the descent',mg_quads,ARRAY[mg_glutes,mg_hamstrings],ARRAY[eq_dumbbells,eq_plyo_box]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Good Morning') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Good Morning','compound',ARRAY['Lower Back'],ARRAY['Hamstrings','Glutes'],ARRAY['Barbell'],false,'Bar on traps, soft knee bend, hinge at hips until torso is near parallel',mg_lower_back,ARRAY[mg_hamstrings,mg_glutes],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dip') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dip','compound',ARRAY['Triceps'],ARRAY['Chest','Shoulders'],ARRAY['Dip Bars'],false,'Lean forward slightly for chest emphasis, stay upright for tricep focus',mg_triceps,ARRAY[mg_chest,mg_shoulders],ARRAY[eq_dip_bars]);
  END IF;

  -- ── Exercises — Olympic ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Power Clean') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Power Clean','olympic',ARRAY['Full Body'],ARRAY['Glutes','Hamstrings','Traps','Shoulders'],ARRAY['Barbell','Weight Plates'],true,'Triple extension (ankle, knee, hip), shrug and pull elbows high, receive bar in quarter squat',mg_full_body,ARRAY[mg_glutes,mg_hamstrings,mg_traps,mg_shoulders],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hang Clean') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hang Clean','olympic',ARRAY['Full Body'],ARRAY['Glutes','Hamstrings','Traps'],ARRAY['Barbell','Weight Plates'],false,'Start from hang (mid-thigh), same triple extension as power clean',mg_full_body,ARRAY[mg_glutes,mg_hamstrings,mg_traps],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hang Power Clean') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hang Power Clean','olympic',ARRAY['Full Body'],ARRAY['Glutes','Hamstrings','Traps'],ARRAY['Barbell','Weight Plates'],false,'Hang position with aggressive triple extension',mg_full_body,ARRAY[mg_glutes,mg_hamstrings,mg_traps],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Power Snatch') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Power Snatch','olympic',ARRAY['Full Body'],ARRAY['Glutes','Hamstrings','Shoulders','Traps'],ARRAY['Barbell','Weight Plates'],false,'Wide grip, high pull and turn bar over, receive with arms locked overhead',mg_full_body,ARRAY[mg_glutes,mg_hamstrings,mg_shoulders,mg_traps],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hang Power Snatch') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hang Power Snatch','olympic',ARRAY['Full Body'],ARRAY['Glutes','Hamstrings','Shoulders'],ARRAY['Barbell','Weight Plates'],false,'From hang position, explosive pull to overhead',mg_full_body,ARRAY[mg_glutes,mg_hamstrings,mg_shoulders],ARRAY[eq_barbell,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Push Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Push Press','olympic',ARRAY['Shoulders'],ARRAY['Triceps','Quadriceps','Traps'],ARRAY['Barbell'],false,'Slight knee dip, drive through legs to initiate press, lock out overhead',mg_shoulders,ARRAY[mg_triceps,mg_quads,mg_traps],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Push Jerk') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Push Jerk','olympic',ARRAY['Shoulders'],ARRAY['Triceps','Quadriceps','Traps'],ARRAY['Barbell'],false,'Dip-drive, punch under bar and receive with split or squat footwork',mg_shoulders,ARRAY[mg_triceps,mg_quads,mg_traps],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Kettlebell Swing') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Kettlebell Swing','olympic',ARRAY['Glutes'],ARRAY['Hamstrings','Lower Back','Shoulders'],ARRAY['Kettlebell'],false,'Hip hinge (not squat), snap hips forward explosively, bell floats to shoulder height',mg_glutes,ARRAY[mg_hamstrings,mg_lower_back,mg_shoulders],ARRAY[eq_kettlebell]);
  END IF;

  -- ── Exercises — Isolation ──────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Barbell Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Barbell Curl','isolation',ARRAY['Biceps'],ARRAY['Forearms'],ARRAY['Barbell'],false,'Elbows pinned to sides, full range of motion, squeeze at top',mg_biceps,ARRAY[mg_forearms],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dumbbell Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dumbbell Curl','isolation',ARRAY['Biceps'],ARRAY['Forearms'],ARRAY['Dumbbells'],false,'Alternate or simultaneous, supinate at top',mg_biceps,ARRAY[mg_forearms],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hammer Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hammer Curl','isolation',ARRAY['Biceps'],ARRAY['Forearms'],ARRAY['Dumbbells'],false,'Neutral grip throughout, targets brachialis and brachioradialis',mg_biceps,ARRAY[mg_forearms],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='EZ Bar Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'EZ Bar Curl','isolation',ARRAY['Biceps'],ARRAY['Forearms'],ARRAY['EZ Curl Bar'],false,'Easier on wrists than straight bar',mg_biceps,ARRAY[mg_forearms],ARRAY[eq_ez_bar]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Cable Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Cable Curl','isolation',ARRAY['Biceps'],ARRAY['Forearms'],ARRAY['Cable Machine'],false,'Constant tension, use low pulley with straight or rope attachment',mg_biceps,ARRAY[mg_forearms],ARRAY[eq_cable]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Skullcrusher') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Skullcrusher','isolation',ARRAY['Triceps'],ARRAY[],ARRAY['EZ Curl Bar','Flat Bench'],false,'Lower bar to forehead, elbows stay pointing at ceiling, extend to lockout',mg_triceps,ARRAY[]::uuid[],ARRAY[eq_ez_bar,eq_flat_bench]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Tricep Pushdown') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Tricep Pushdown','isolation',ARRAY['Triceps'],ARRAY[],ARRAY['Cable Machine'],false,'High pulley, elbows tucked, push straight down to full extension',mg_triceps,ARRAY[]::uuid[],ARRAY[eq_cable]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Overhead Tricep Extension') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Overhead Tricep Extension','isolation',ARRAY['Triceps'],ARRAY[],ARRAY['EZ Curl Bar','Dumbbells'],false,'Arms overhead, elbows pointing up, lower behind head',mg_triceps,ARRAY[]::uuid[],ARRAY[eq_ez_bar,eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Close-Grip Bench Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Close-Grip Bench Press','isolation',ARRAY['Triceps'],ARRAY['Chest'],ARRAY['Barbell','Flat Bench'],false,'Grip slightly inside shoulder width, elbows tuck close to body',mg_triceps,ARRAY[mg_chest],ARRAY[eq_barbell,eq_flat_bench]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Lateral Raise') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Lateral Raise','isolation',ARRAY['Shoulders'],ARRAY[],ARRAY['Dumbbells'],false,'Slight forward lean, lead with elbows to shoulder height, controlled descent',mg_shoulders,ARRAY[]::uuid[],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Face Pull') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Face Pull','isolation',ARRAY['Rear Delts'],ARRAY['Upper Back','Rhomboids'],ARRAY['Cable Machine'],false,'Rope attachment at face height, pull to ears, externally rotate at end range',mg_rear_delts,ARRAY[mg_upper_back,mg_rhomboids],ARRAY[eq_cable]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Rear Delt Fly') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Rear Delt Fly','isolation',ARRAY['Rear Delts'],ARRAY['Rhomboids','Upper Back'],ARRAY['Dumbbells'],false,'Bent over, slight elbow bend, arms fly out to sides',mg_rear_delts,ARRAY[mg_rhomboids,mg_upper_back],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Cable Fly') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Cable Fly','isolation',ARRAY['Chest'],ARRAY[],ARRAY['Cable Machine'],false,'Cross-body motion, slight bend in elbows throughout, feel the stretch at full extension',mg_chest,ARRAY[]::uuid[],ARRAY[eq_cable]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Leg Extension') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Leg Extension','isolation',ARRAY['Quadriceps'],ARRAY[],ARRAY['Leg Extension Machine'],false,'Full extension, slow controlled descent',mg_quads,ARRAY[]::uuid[],ARRAY[eq_leg_ext]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Lying Leg Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Lying Leg Curl','isolation',ARRAY['Hamstrings'],ARRAY[],ARRAY['Leg Curl Machine'],false,'Hips stay down, full range of motion, squeeze at top',mg_hamstrings,ARRAY[]::uuid[],ARRAY[eq_leg_curl]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Nordic Hamstring Curl') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Nordic Hamstring Curl','isolation',ARRAY['Hamstrings'],ARRAY[],ARRAY['GHD Machine'],false,'Anchor ankles, lower body with hamstrings resisting, use hands to push up',mg_hamstrings,ARRAY[]::uuid[],ARRAY[eq_ghd]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Standing Calf Raise') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Standing Calf Raise','isolation',ARRAY['Calves'],ARRAY[],ARRAY['Barbell','Power Rack'],false,'Full range of motion — deep stretch at bottom, rise onto toes at top, pause each rep',mg_calves,ARRAY[]::uuid[],ARRAY[eq_barbell,eq_power_rack]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Seated Calf Raise') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Seated Calf Raise','isolation',ARRAY['Calves'],ARRAY[],ARRAY['Dumbbells'],false,'Knee at 90 degrees, weight on lower thigh, full range',mg_calves,ARRAY[]::uuid[],ARRAY[eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Barbell Shrug') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Barbell Shrug','isolation',ARRAY['Traps'],ARRAY['Forearms'],ARRAY['Barbell'],false,'Straight arms, shrug straight up — do not roll shoulders',mg_traps,ARRAY[mg_forearms],ARRAY[eq_barbell]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Upright Row') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Upright Row','isolation',ARRAY['Traps'],ARRAY['Shoulders'],ARRAY['Barbell','Dumbbells'],false,'Pull bar up to chin, elbows lead and flare wide',mg_traps,ARRAY[mg_shoulders],ARRAY[eq_barbell,eq_dumbbells]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Farmer''s Carry') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Farmer''s Carry','isolation',ARRAY['Forearms'],ARRAY['Traps','Core','Glutes'],ARRAY['Dumbbells','Kettlebell'],false,'Heavy load, upright posture, short quick steps, squeeze handles hard',mg_forearms,ARRAY[mg_traps,mg_abs,mg_glutes],ARRAY[eq_dumbbells,eq_kettlebell]);
  END IF;

  -- ── Exercises — Core ──────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Plank') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Plank','core',ARRAY['Abs'],ARRAY['Obliques','Glutes','Lower Back'],ARRAY['Bodyweight'],false,'Elbows under shoulders, hollow body position, squeeze glutes, do not let hips sag or rise',mg_abs,ARRAY[mg_obliques,mg_glutes,mg_lower_back],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Side Plank') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Side Plank','core',ARRAY['Obliques'],ARRAY['Abs','Glutes'],ARRAY['Bodyweight'],false,'Elbow under shoulder, body in straight line, hold or add hip dip',mg_obliques,ARRAY[mg_abs,mg_glutes],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Ab Wheel Rollout') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Ab Wheel Rollout','core',ARRAY['Abs'],ARRAY['Lower Back','Shoulders'],ARRAY['Ab Wheel'],false,'Start on knees, hollow body, roll out until hips align with shoulders, pull back with abs',mg_abs,ARRAY[mg_lower_back,mg_shoulders],ARRAY[eq_ab_wheel]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hanging Leg Raise') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hanging Leg Raise','core',ARRAY['Abs'],ARRAY['Hip Flexors'],ARRAY['Pull-up Bar'],false,'Dead hang, raise legs to 90 degrees or higher, control the descent',mg_abs,ARRAY[mg_hip_flexors],ARRAY[eq_pullup_bar]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Cable Crunch') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Cable Crunch','core',ARRAY['Abs'],ARRAY[],ARRAY['Cable Machine'],false,'Kneel at cable, pull elbows to knees, crunch from hips — do not pull with arms',mg_abs,ARRAY[]::uuid[],ARRAY[eq_cable]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Russian Twist') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Russian Twist','core',ARRAY['Obliques'],ARRAY['Abs'],ARRAY['Medicine Ball','Weight Plates'],false,'Feet off ground, rotate fully side to side, hold weight at chest',mg_obliques,ARRAY[mg_abs],ARRAY[eq_med_ball,eq_plates]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Dead Bug') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Dead Bug','core',ARRAY['Abs'],ARRAY['Lower Back'],ARRAY['Bodyweight'],false,'Low back pressed into floor, extend opposite arm and leg, breathe out as you extend',mg_abs,ARRAY[mg_lower_back],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Bird Dog') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Bird Dog','core',ARRAY['Lower Back'],ARRAY['Glutes','Abs'],ARRAY['Bodyweight'],false,'Neutral spine, extend opposite arm and leg simultaneously, do not rotate hips',mg_lower_back,ARRAY[mg_glutes,mg_abs],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Back Extension') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Back Extension','core',ARRAY['Lower Back'],ARRAY['Glutes','Hamstrings'],ARRAY['GHD Machine'],false,'Hips at pad edge, lower to 90 degrees, extend to parallel — do not hyperextend',mg_lower_back,ARRAY[mg_glutes,mg_hamstrings],ARRAY[eq_ghd]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='GHD Sit-up') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'GHD Sit-up','core',ARRAY['Abs'],ARRAY['Hip Flexors'],ARRAY['GHD Machine'],false,'Full range — lower to parallel or below, sit up and touch toes',mg_abs,ARRAY[mg_hip_flexors],ARRAY[eq_ghd]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Landmine Rotation') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Landmine Rotation','core',ARRAY['Obliques'],ARRAY['Abs','Shoulders'],ARRAY['Barbell','Landmine'],false,'Arms extended, rotate from hips and core, control through full arc',mg_obliques,ARRAY[mg_abs,mg_shoulders],ARRAY[eq_barbell,eq_landmine]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Pallof Press') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Pallof Press','core',ARRAY['Obliques'],ARRAY['Abs'],ARRAY['Cable Machine','Resistance Bands'],false,'Anti-rotation exercise, press straight out and hold, do not let cable pull you',mg_obliques,ARRAY[mg_abs],ARRAY[eq_cable,eq_bands]);
  END IF;

  -- ── Exercises — Conditioning ───────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Sled Push') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Sled Push','conditioning',ARRAY['Full Body'],ARRAY['Quadriceps','Glutes','Calves'],ARRAY['Sled'],false,'Low angle, drive through balls of feet, short powerful steps',mg_full_body,ARRAY[mg_quads,mg_glutes,mg_calves],ARRAY[eq_sled]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Sled Pull') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Sled Pull','conditioning',ARRAY['Full Body'],ARRAY['Hamstrings','Glutes','Upper Back'],ARRAY['Sled'],false,'Walk backward pulling sled, drive through heels',mg_full_body,ARRAY[mg_hamstrings,mg_glutes,mg_upper_back],ARRAY[eq_sled]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Battle Ropes') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Battle Ropes','conditioning',ARRAY['Shoulders'],ARRAY['Full Body','Core'],ARRAY['Battle Ropes'],false,'Athletic stance, alternate or simultaneous waves, drive power from hips',mg_shoulders,ARRAY[mg_full_body,mg_abs],ARRAY[eq_battle_ropes]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Box Jump') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Box Jump','conditioning',ARRAY['Quadriceps'],ARRAY['Glutes','Calves'],ARRAY['Plyo Box'],false,'Countermovement, land softly on full foot, step down (do not jump down)',mg_quads,ARRAY[mg_glutes,mg_calves],ARRAY[eq_plyo_box]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Broad Jump') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Broad Jump','conditioning',ARRAY['Full Body'],ARRAY['Quadriceps','Glutes','Calves'],ARRAY['Bodyweight'],false,'Arm swing, load hips, drive forward, land with soft knees',mg_full_body,ARRAY[mg_quads,mg_glutes,mg_calves],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Burpee') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Burpee','conditioning',ARRAY['Full Body'],ARRAY['Chest','Shoulders','Quadriceps'],ARRAY['Bodyweight'],false,'Smooth transition floor to jump, full hip extension at top',mg_full_body,ARRAY[mg_chest,mg_shoulders,mg_quads],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Jump Rope') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Jump Rope','conditioning',ARRAY['Calves'],ARRAY['Full Body'],ARRAY['Jump Rope'],false,'Land on balls of feet, keep elbows close, use wrists to turn rope',mg_calves,ARRAY[mg_full_body],ARRAY[eq_jump_rope]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Zercher Carry') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Zercher Carry','conditioning',ARRAY['Full Body'],ARRAY['Biceps','Core','Traps'],ARRAY['Barbell'],false,'Bar in crook of elbows, upright posture, brace core hard, steady steps',mg_full_body,ARRAY[mg_biceps,mg_abs,mg_traps],ARRAY[eq_barbell]);
  END IF;

  -- ── Exercises — Mobility ───────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Hip 90/90 Stretch') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Hip 90/90 Stretch','mobility',ARRAY['Hip Flexors'],ARRAY['Adductors','Glutes'],ARRAY['Bodyweight'],false,'Both legs at 90 degrees, sit tall, lean into front hip',mg_hip_flexors,ARRAY[mg_adductors,mg_glutes],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='World''s Greatest Stretch') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'World''s Greatest Stretch','mobility',ARRAY['Full Body'],ARRAY['Hip Flexors','Upper Back','Adductors'],ARRAY['Bodyweight'],false,'Lunge position, same-side elbow to floor, rotate and reach to sky',mg_full_body,ARRAY[mg_hip_flexors,mg_upper_back,mg_adductors],ARRAY[eq_bodyweight]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Thoracic Extension') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Thoracic Extension','mobility',ARRAY['Upper Back'],ARRAY[],ARRAY['Foam Roller'],false,'Foam roller across mid back, support head, slowly extend over roller',mg_upper_back,ARRAY[]::uuid[],ARRAY[eq_foam_roller]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Foam Rolling') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Foam Rolling','mobility',ARRAY['Full Body'],ARRAY[],ARRAY['Foam Roller'],false,'Slow passes, pause on tight spots 30–60 seconds, avoid rolling joints',mg_full_body,ARRAY[]::uuid[],ARRAY[eq_foam_roller]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM strength_exercises WHERE tenant_id IS NULL AND name='Ankle Mobility Drill') THEN
    INSERT INTO strength_exercises (tenant_id,name,category,primary_muscles,secondary_muscles,equipment_keys,is_primary_lift,coaching_cues,primary_muscle_group_id,secondary_muscle_group_ids,equipment_ids)
    VALUES (NULL,'Ankle Mobility Drill','mobility',ARRAY['Calves'],ARRAY['Hip Flexors'],ARRAY['Bodyweight'],false,'Foot against wall, drive knee forward over toes, keep heel down',mg_calves,ARRAY[mg_hip_flexors],ARRAY[eq_bodyweight]);
  END IF;

END $$;
