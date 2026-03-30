/** PATCH/DELETE /api/strength/exercises/[id] — custom exercises only */
import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { apiError } from '@/lib/api-error';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: u } = await sb.from('users').select('tenant_id, role').eq('id', user.id).single();
    if (!u || (u.role !== 'Admin' && u.role !== 'Coach')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow editing tenant-owned exercises
    const { data: ex } = await sb.from('strength_exercises')
      .select('tenant_id').eq('id', id).single();
    if (!ex) return Response.json({ error: 'Not found' }, { status: 404 });
    if (ex.tenant_id !== u.tenant_id) {
      return Response.json({ error: 'Cannot edit global exercises' }, { status: 403 });
    }

    const body = await request.json();
    const allowed = ['name','category','primary_muscles','secondary_muscles','equipment_keys','demo_video_url','coaching_cues','is_primary_lift'];
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    const { data, error } = await sb.from('strength_exercises')
      .update(updates).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ...data, is_global: false });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sb = getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: u } = await sb.from('users').select('tenant_id, role').eq('id', user.id).single();
    if (!u || (u.role !== 'Admin' && u.role !== 'Coach')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: ex } = await sb.from('strength_exercises')
      .select('tenant_id').eq('id', id).single();
    if (!ex) return Response.json({ error: 'Not found' }, { status: 404 });
    if (ex.tenant_id !== u.tenant_id) {
      return Response.json({ error: 'Cannot delete global exercises' }, { status: 403 });
    }

    const { error } = await sb.from('strength_exercises').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
