"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Player } from "@/types/player";
import { useAttendance } from "@/hooks/useAttendance";

interface Props {
  date:     string;
  teamId:   string | null | undefined;
  players:  Player[];
  /** Called with the set of currently-absent playerIds so the plan can auto-remove them from groups */
  onAbsentChange?: (absentPlayerIds: Set<string>) => void;
}

export default function AttendancePanel({ date, teamId, players, onAbsentChange }: Props) {
  const { absences, loading, isAbsent, getAbsence, markAbsent, markPresent } =
    useAttendance(date, teamId);

  const [open,    setOpen]    = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);   // playerId being saved

  const sorted   = [...players].sort((a, b) => a.jersey_number - b.jersey_number);
  const absentCount  = absences.length;
  const presentCount = players.length - absentCount;

  async function toggle(player: Player) {
    if (saving) return;
    setSaving(player.id);
    try {
      if (isAbsent(player.id)) {
        await markPresent(player.id);
        const next = new Set(absences.filter((a) => a.player_id !== player.id).map((a) => a.player_id));
        onAbsentChange?.(next);
      } else {
        await markAbsent(player.id, "unexcused");
        const next = new Set([...absences.map((a) => a.player_id), player.id]);
        onAbsentChange?.(next);
      }
    } catch {}
    setSaving(null);
  }

  async function setExcuse(player: Player, status: "excused" | "unexcused") {
    if (saving) return;
    setSaving(player.id);
    try {
      await markAbsent(player.id, status);
    } catch {}
    setSaving(null);
  }

  if (players.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold">Attendance</span>
          {loading ? (
            <Loader2 size={12} className="animate-spin text-gray-500" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
                <CheckCircle2 size={10} /> {presentCount} present
              </span>
              {absentCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-red-400">
                  <XCircle size={10} /> {absentCount} absent
                </span>
              )}
            </div>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      {/* Player list */}
      {open && (
        <div className="border-t border-gray-700 divide-y divide-gray-700/40">
          {sorted.map((player) => {
            const absent  = isAbsent(player.id);
            const absence = getAbsence(player.id);
            const busy    = saving === player.id;

            return (
              <div key={player.id}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${absent ? "bg-red-500/5" : ""}`}
              >
                {/* Toggle button */}
                <button
                  type="button"
                  onClick={() => toggle(player)}
                  disabled={!!saving}
                  className="shrink-0 transition-opacity disabled:opacity-50"
                  title={absent ? "Mark present" : "Mark absent"}
                >
                  {busy ? (
                    <Loader2 size={18} className="animate-spin text-gray-500" />
                  ) : absent ? (
                    <XCircle size={18} className="text-red-400" />
                  ) : (
                    <CheckCircle2 size={18} className="text-green-400" />
                  )}
                </button>

                {/* Jersey + name */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-gray-500 font-mono text-xs w-6 shrink-0">#{player.jersey_number}</span>
                  <span className={`text-sm font-medium truncate ${absent ? "text-gray-400 line-through" : "text-white"}`}>
                    {player.name}
                  </span>
                </div>

                {/* Excused / Unexcused toggle — only when absent */}
                {absent && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={!!saving}
                      onClick={() => setExcuse(player, "excused")}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wide border transition-colors ${
                        absence?.status === "excused"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-transparent text-gray-600 border-gray-700 hover:border-gray-500 hover:text-gray-400"
                      }`}
                    >
                      Excused
                    </button>
                    <button
                      type="button"
                      disabled={!!saving}
                      onClick={() => setExcuse(player, "unexcused")}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wide border transition-colors ${
                        absence?.status === "unexcused"
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : "bg-transparent text-gray-600 border-gray-700 hover:border-gray-500 hover:text-gray-400"
                      }`}
                    >
                      Unexcused
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
