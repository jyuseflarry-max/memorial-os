/** PATCH/DELETE /api/inventory/kit-templates/[id] */
import { getDb }    from '@/lib/db';
import { apiError } from '@/lib/api-error';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = await getDb();
    const { data, error } = await db
      .update('inventory_kit_templates', body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const { error } = await db
      .delete('inventory_kit_templates')
      .eq('id', id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) {
    return apiError(err);
  }
}
