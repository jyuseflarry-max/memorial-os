/** POST /api/attendance/proof
 * Player uploads makeup proof for an attendance record.
 * Body: multipart/form-data  { attendance_id: string, file: File }
 * Saves to storage and updates practice_attendance row.
 */
import { NextRequest }                       from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError }                          from "@/lib/api-error";

const BUCKET = "attendance-proof";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service
      .from("users")
      .select("tenant_id, role")
      .eq("id", me.id)
      .single();
    if (!myRecord) return apiError("User record not found", 403);

    const form = await request.formData();
    const attendanceId = form.get("attendance_id") as string | null;
    const file         = form.get("file") as File | null;

    if (!attendanceId || !file) return apiError("attendance_id and file are required", 400);
    if (file.size > MAX_BYTES)  return apiError("File exceeds 10 MB limit", 400);

    // Verify the attendance record belongs to this player (or staff can upload for any)
    const { data: record, error: recErr } = await service
      .from("practice_attendance")
      .select("id, player_id, tenant_id")
      .eq("id", attendanceId)
      .eq("tenant_id", myRecord.tenant_id)
      .single();

    if (recErr || !record) return apiError("Attendance record not found", 404);

    const isStaff = ["admin", "coach", "manager"].includes(myRecord.role);
    if (!isStaff) {
      // Look up player record linked to this user
      const { data: playerRecord } = await service
        .from("players")
        .select("id")
        .eq("user_id", me.id)
        .eq("tenant_id", myRecord.tenant_id)
        .single();

      if (!playerRecord || playerRecord.id !== record.player_id) {
        return apiError("Forbidden", 403);
      }
    }

    // Build storage path: {tenant_id}/{player_id}/{attendance_id}_{filename}
    const ext      = file.name.split(".").pop() ?? "bin";
    const safeName = `${attendanceId}.${ext}`;
    const path     = `${myRecord.tenant_id}/${record.player_id}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await service.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType:  file.type,
        upsert:       true,
      });
    if (uploadErr) throw uploadErr;

    // Build a signed URL (valid 7 days) to return in the record
    const { data: signed } = await service.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    // Update attendance record
    const { data: updated, error: updErr } = await service
      .from("practice_attendance")
      .update({
        makeup_proof_url:    path,
        makeup_proof_name:   file.name,
        makeup_completed_at: new Date().toISOString(),
      })
      .eq("id", attendanceId)
      .select("id, makeup_proof_url, makeup_proof_name, makeup_completed_at")
      .single();

    if (updErr) throw updErr;

    return Response.json({
      ...updated,
      signed_url: signed?.signedUrl ?? null,
    }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}

/** GET /api/attendance/proof?attendance_id=  — get a fresh signed URL for viewing */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get("attendance_id");
    if (!attendanceId) return apiError("attendance_id is required", 400);

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service
      .from("users")
      .select("tenant_id, role")
      .eq("id", me.id)
      .single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data: record, error: recErr } = await service
      .from("practice_attendance")
      .select("id, player_id, makeup_proof_url, makeup_proof_name, makeup_completed_at")
      .eq("id", attendanceId)
      .eq("tenant_id", myRecord.tenant_id)
      .single();

    if (recErr || !record) return apiError("Not found", 404);
    if (!record.makeup_proof_url) return Response.json({ signed_url: null });

    const isStaff = ["admin", "coach", "manager"].includes(myRecord.role);
    if (!isStaff) {
      const { data: playerRecord } = await service
        .from("players")
        .select("id")
        .eq("user_id", me.id)
        .eq("tenant_id", myRecord.tenant_id)
        .single();

      if (!playerRecord || playerRecord.id !== record.player_id) {
        return apiError("Forbidden", 403);
      }
    }

    const { data: signed } = await service.storage
      .from(BUCKET)
      .createSignedUrl(record.makeup_proof_url, 60 * 60);

    return Response.json({ signed_url: signed?.signedUrl ?? null, name: record.makeup_proof_name });
  } catch (err) {
    return apiError(err);
  }
}
