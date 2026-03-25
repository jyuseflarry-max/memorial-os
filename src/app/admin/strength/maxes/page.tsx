"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart2, Loader2, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";

// ── Types ──────────────────────────────────────────────────────────────────

type Lift = "back_squat" | "power_clean" | "bench_press";

interface PlayerMax {
  player_id:    string;
  name:         string;
  jersey_number: number;
  back_squat:   number | null;
  power_clean:  number | null;
  bench_press:  number | null;
  recorded_on:  string | null;
}

interface HistoryRow {
  recorded_on:  string;
  back_squat:   number | null;
  power_clean:  number | null;
  bench_press:  number | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface RowState {
  back_squat:  string;
  power_clean: string;
  bench_press: string;
  status:      SaveStatus;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LIFTS: { key: Lift; label: string; unit: string }[] = [
  { key: "back_squat",  label: "Back Squat",   unit: "lbs" },
  { key: "power_clean", label: "Power Clean",  unit: "lbs" },
  { key: "bench_press", label: "Bench Press",  unit: "lbs" },
];

const LIFT_COLORS: Record<Lift, string> = {
  back_squat:  "bg-coaches-red",
  power_clean: "bg-sky-400",
  bench_press: "bg-emerald-400",
};

const LIFT_TEXT: Record<Lift, string> = {
  back_squat:  "text-coaches-red",
  power_clean: "text-sky-400",
  bench_press: "text-emerald-400",
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── History modal ──────────────────────────────────────────────────────────

function HistoryModal({ playerName, playerId, onClose }: {
  playerName: string;
  playerId:   string;
  onClose:    () => void;
}) {
  const [rows,    setRows]    = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/strength/maxes/history?player_id=${playerId}&limit=3`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [playerId]);

  // Determine trend icon for a lift across entries (newest first)
  function trend(key: Lift) {
    const vals = rows.map((r) => r[key]).filter((v): v is number => v !== null);
    if (vals.length < 2) return null;
    const diff = vals[0] - vals[1];
    if (diff > 0) return <TrendingUp  size={13} className="text-emerald-400" />;
    if (diff < 0) return <TrendingDown size={13} className="text-coaches-red" />;
    return <Minus size={13} className="text-gray-500" />;
  }

  // Bar chart — normalise within each lift column
  function maxVal(key: Lift) {
    return Math.max(...rows.map((r) => r[key] ?? 0), 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">{playerName}</h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">STRENGTH HISTORY · LAST 3 SESSIONS</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-coaches-red" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-gray-600 font-mono text-xs text-center py-8">NO RECORDS YET</p>
          ) : (
            <div className="flex flex-col gap-5">
              {LIFTS.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${LIFT_TEXT[key]}`}>
                      {label}
                    </span>
                    {trend(key)}
                  </div>
                  <div className="flex items-end gap-2 h-14">
                    {rows.map((row, i) => {
                      const val = row[key] ?? 0;
                      const pct = maxVal(key) > 0 ? (val / maxVal(key)) * 100 : 0;
                      const isNewest = i === 0;
                      return (
                        <div key={row.recorded_on} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-white font-mono text-xs font-bold">
                            {val > 0 ? val : "—"}
                          </span>
                          <div className="w-full bg-gray-800 rounded-sm overflow-hidden" style={{ height: "32px" }}>
                            <div
                              className={`w-full rounded-sm transition-all duration-500 ${
                                isNewest ? LIFT_COLORS[key] : LIFT_COLORS[key] + "/40"
                              }`}
                              style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                            />
                          </div>
                          <span className="text-gray-600 font-mono text-[9px] text-center leading-tight">
                            {fmtDate(row.recorded_on)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ArmoryPage() {
  const { activeTeam } = useTeam();

  const [players,  setPlayers]  = useState<PlayerMax[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Row state: current field values + save status per player
  const [rows, setRows] = useState<Map<string, RowState>>(new Map());

  // Debounce timers per player
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // History modal
  const [historyPlayer, setHistoryPlayer] = useState<{ id: string; name: string } | null>(null);

  // Load players + latest maxes
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    fetch(`/api/strength/maxes?${params}`)
      .then((r) => r.json())
      .then((data: PlayerMax[]) => {
        setPlayers(data);
        const map = new Map<string, RowState>();
        for (const p of data) {
          map.set(p.player_id, {
            back_squat:  p.back_squat  != null ? String(p.back_squat)  : "",
            power_clean: p.power_clean != null ? String(p.power_clean) : "",
            bench_press: p.bench_press != null ? String(p.bench_press) : "",
            status: "idle",
          });
        }
        setRows(map);
      })
      .catch(() => setError("Failed to load player maxes"))
      .finally(() => setLoading(false));
  }, [activeTeam]);

  // Update a single field + trigger debounced save
  const handleChange = useCallback((playerId: string, lift: Lift, raw: string) => {
    // Optimistic update
    setRows((prev) => {
      const next = new Map(prev);
      const cur  = next.get(playerId);
      if (!cur) return prev;
      next.set(playerId, { ...cur, [lift]: raw, status: "saving" });
      return next;
    });

    // Debounce save
    const existing = timers.current.get(playerId);
    if (existing) clearTimeout(existing);

    const tid = setTimeout(async () => {
      const current = await new Promise<RowState | undefined>((resolve) => {
        setRows((prev) => { resolve(prev.get(playerId)); return prev; });
      });
      if (!current) return;

      const payload = {
        player_id:   playerId,
        recorded_on: today(),
        back_squat:  current.back_squat  !== "" ? parseFloat(current.back_squat)  : null,
        power_clean: current.power_clean !== "" ? parseFloat(current.power_clean) : null,
        bench_press: current.bench_press !== "" ? parseFloat(current.bench_press) : null,
      };

      const res  = await fetch("/api/strength/maxes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      setRows((prev) => {
        const next = new Map(prev);
        const cur  = next.get(playerId);
        if (!cur) return prev;
        next.set(playerId, { ...cur, status: res.ok ? "saved" : "error" });
        return next;
      });

      // Reset "saved" back to idle after 2.5 s
      if (res.ok) {
        setTimeout(() => {
          setRows((prev) => {
            const next = new Map(prev);
            const cur  = next.get(playerId);
            if (cur?.status === "saved") next.set(playerId, { ...cur, status: "idle" });
            return next;
          });
        }, 2500);
      }
    }, 600);

    timers.current.set(playerId, tid);
  }, []);

  const inputCls = (status: SaveStatus) =>
    `w-full bg-gray-900 border rounded-lg px-2 py-2 text-sm font-mono text-white text-center
     focus:outline-none transition-colors
     ${status === "error"
       ? "border-coaches-red focus:border-coaches-red"
       : "border-gray-700 focus:border-coaches-red"
     }`;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Iron Lab</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            ARMORY · {activeTeam?.name.toUpperCase() ?? "ALL PLAYERS"} · STRENGTH MAXES
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          Auto-saves to today&apos;s record
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[2rem_1fr_7rem_7rem_7rem_2.5rem] gap-3 px-4 py-3
                        border-b border-gray-700 items-center">
          <div />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Player</span>
          {LIFTS.map(({ key, label }) => (
            <span key={key} className={`text-[10px] font-mono uppercase tracking-wider text-center ${LIFT_TEXT[key]}`}>
              {label}
            </span>
          ))}
          <div />
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-coaches-red" />
          </div>
        ) : players.length === 0 ? (
          <div className="py-16 text-center text-gray-600 font-mono text-xs">
            NO PLAYERS — ADD PLAYERS IN MANAGE ROSTER
          </div>
        ) : (
          players.map((player) => {
            const row = rows.get(player.player_id);
            if (!row) return null;

            return (
              <div
                key={player.player_id}
                className="grid grid-cols-[2rem_1fr_7rem_7rem_7rem_2.5rem] gap-3 px-4 py-3
                           border-b border-gray-700/50 last:border-0 items-center
                           hover:bg-gray-800/50 transition-colors"
              >
                {/* Jersey */}
                <span className="text-gray-600 font-mono text-xs font-bold text-center">
                  {player.jersey_number}
                </span>

                {/* Name + status */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm font-medium truncate">{player.name}</span>
                  {row.status === "saving" && (
                    <Loader2 size={11} className="animate-spin text-gray-500 shrink-0" />
                  )}
                  {row.status === "saved" && (
                    <span className="text-emerald-400 text-[9px] font-mono shrink-0">SAVED</span>
                  )}
                  {row.status === "error" && (
                    <span className="text-coaches-red text-[9px] font-mono shrink-0">ERROR</span>
                  )}
                </div>

                {/* Lift inputs */}
                {LIFTS.map(({ key }) => (
                  <input
                    key={key}
                    type="number"
                    min={0}
                    max={999}
                    step={5}
                    value={row[key]}
                    placeholder="—"
                    className={inputCls(row.status)}
                    onChange={(e) => handleChange(player.player_id, key, e.target.value)}
                  />
                ))}

                {/* History icon */}
                <button
                  onClick={() => setHistoryPlayer({ id: player.player_id, name: player.name })}
                  title="View strength history"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600
                             hover:text-sky-400 hover:bg-sky-400/10 transition-colors"
                >
                  <BarChart2 size={15} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] font-mono text-gray-700 mt-3 text-right">
        Changes save automatically · one record per day · click chart icon for history
      </p>

      {/* History modal */}
      {historyPlayer && (
        <HistoryModal
          playerName={historyPlayer.name}
          playerId={historyPlayer.id}
          onClose={() => setHistoryPlayer(null)}
        />
      )}
    </DashboardLayout>
  );
}
