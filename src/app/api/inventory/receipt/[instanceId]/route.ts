/** POST /api/inventory/receipt/[instanceId] — player or staff confirms receipt */
import { getDb }           from '@/lib/db';
import { getSupabaseUser } from '@/lib/supabase/server';
import { apiError }        from '@/lib/api-error';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ instanceId: string }> },
) {
  try {
    const { instanceId } = await params;
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();

    const db = await getDb();
    const { data, error } = await db
      .update('inventory_instances', {
        receipt_confirmed_at: new Date().toISOString(),
        receipt_confirmed_by: user?.id ?? null,
      })
      .eq('id', instanceId)
      .select()
      .single();
    if (error) throw error;

    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}
