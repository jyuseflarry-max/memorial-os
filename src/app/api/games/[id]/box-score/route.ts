import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const BUCKET = "box-scores";

/** POST /api/games/[id]/box-score
 *  Accepts multipart/form-data with a "file" field (PDF).
 *  Uploads to Supabase Storage, saves public URL on the game row.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return Response.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const path = `${id}/box-score.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: "application/pdf" });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from("games")
      .update({ box_score_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** DELETE /api/games/[id]/box-score
 *  Removes the PDF from storage and clears box_score_url on the game row.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();

    await supabase.storage.from(BUCKET).remove([`${id}/box-score.pdf`]);

    const { data, error } = await supabase
      .from("games")
      .update({ box_score_url: null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
