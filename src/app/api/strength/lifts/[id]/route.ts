/** PATCH /api/strength/lifts/[id] — update / verify a lift
 *  DELETE /api/strength/lifts/[id] */
import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { apiError } from '@/lib/api-error';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      weight_lbs?: number; reps?: number; tempo?: string;
      session_notes?: string; is_verified?: boolean;
      verification_video_url?: string;
    };

    const updates: Record<string, unknown> = {};
    if (body.weight_lbs !== undefined)           updates.weight_lbs = body.weight_lbs;
    if (body.reps !== undefined)                 updates.reps = body.reps;
    if (body.tempo !== undefined)                updates.tempo = body.tempo;
    if (body.session_notes !== undefined)        updates.session_notes = body.session_notes;
    if (body.verification_video_url !== undefined) updates.verification_video_url = body.verification_video_url;
    if (body.is_verified === true) {
      updates.is_verified = true;
      updates.verified_by = user.id;
    }

    const { data, error } = await sb.from('strength_lifts')
      .update(updates).eq('id', params.id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await sb.from('strength_lifts').delete().eq('id', params.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
