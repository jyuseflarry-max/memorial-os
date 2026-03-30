/**
 * GET  /api/strength/biometrics          — all players (Coach/Admin only, returns decrypted PII)
 * GET  /api/strength/biometrics?public=1 — current player's non-PII view
 * PUT  /api/strength/biometrics          — upsert biometrics (Coach/Admin only)
 */
import { NextRequest } from 'next/server';
import { getDb }          from '@/lib/db';
import { getSupabaseServer } from '@/lib/supabase/server';
import { encryptField, decryptField } from '@/lib/strength-crypto';
import { calcAthleticAge } from '@/lib/strength-utils';
import { apiError }       from '@/lib/api-error';

async function getUserRole(userId: string) {
  const sb = getSupabaseServer();
  const { data } = await sb.from('users').select('role').eq('id', userId).single();
  return data?.role ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const db   = await getDb();
    const sb   = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getUserRole(user.id);
    const isCoach = role === 'Admin' || role === 'Coach';

    if (!isCoach) {
      // Players: return only their own non-PII view
      const { data } = await db.from('strength_biometrics')
        .select('player_id, biological_sex, dob_enc, bw_enc, updated_at')
        .eq('player_id', user.id)
        .maybeSingle();
      if (!data) return Response.json(null);
      const dob = decryptField(data.dob_enc);
      return Response.json({
        player_id: data.player_id,
        biological_sex: data.biological_sex,
        has_dob: !!dob,
        has_body_weight: !!data.bw_enc,
        age_display: dob ? calcAthleticAge(dob).display : null,
      });
    }

    // Coaches/Admins: full decrypted records + join player name
    const { data: players } = await db.from('players')
      .select('id, name, jersey_number');
    const { data: bios } = await db.from('strength_biometrics')
      .select('player_id, biological_sex, dob_enc, bw_enc, updated_at, updated_by');

    const bioMap = new Map((bios ?? []).map((b: Record<string, unknown>) => [b.player_id, b]));

    const result = (players ?? []).map((p: { id: string; name: string; jersey_number: number | null }) => {
      const bio = bioMap.get(p.id) as Record<string, unknown> | undefined;
      const dob = decryptField(bio?.dob_enc as string | null);
      const bw  = decryptField(bio?.bw_enc as string | null);
      return {
        player_id:      p.id,
        player_name:    p.name,
        jersey_number:  p.jersey_number,
        biological_sex: bio?.biological_sex ?? null,
        dob:            dob,              // YYYY-MM-DD — Coach-Only
        body_weight_lbs: bw ? parseFloat(bw) : null, // Coach-Only
        age_display:    dob ? calcAthleticAge(dob).display : null,
        updated_at:     bio?.updated_at ?? null,
        updated_by:     bio?.updated_by ?? null,
      };
    });

    return Response.json(result);
  } catch (err) {
    return apiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getUserRole(user.id);
    if (role !== 'Admin' && role !== 'Coach') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as {
      player_id: string;
      tenant_id: string;
      biological_sex?: string | null;
      dob?: string | null;
      body_weight_lbs?: number | null;
    };

    const upsertPayload: Record<string, unknown> = {
      player_id:      body.player_id,
      tenant_id:      body.tenant_id,
      updated_at:     new Date().toISOString(),
      updated_by:     user.id,
    };

    if (body.biological_sex !== undefined) upsertPayload.biological_sex = body.biological_sex;
    if (body.dob !== undefined)            upsertPayload.dob_enc = body.dob ? encryptField(body.dob) : null;
    if (body.body_weight_lbs !== undefined) upsertPayload.bw_enc = body.body_weight_lbs ? encryptField(String(body.body_weight_lbs)) : null;

    const { error } = await sb.from('strength_biometrics')
      .upsert(upsertPayload, { onConflict: 'tenant_id,player_id' });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
