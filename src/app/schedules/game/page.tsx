"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit2, Trash2, ExternalLink, FileText, Video,
  X, Save, Loader2, Trophy, ClipboardList, Target,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import type { Game, LocationType, GameType, GameDraft } from "@/types/game";
import { LOCATION_LABELS, GAME_TYPE_LABELS, EMPTY_DRAFT } from "@/types/game";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt12h(time: string | null): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

function fmtDate(iso: string): { short: string; month: string; dayNum: string; weekday: string } {
  const d = new Date(iso + "T12:00:00");
  return {
    short:   d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    month:   d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    dayNum:  d.toLocaleDateString("en-US", { day: "2-digit" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function gameResult(g: Game): "win" | "loss" | "upcoming" {
  if (g.score_us === null || g.score_them === null) return "upcoming";
  return g.score_us > g.score_them ? "win" : "loss";
}

// ── Badges ─────────────────────────────────────────────────────────────────

const LOCATION_STYLES: Record<LocationType, string> = {
  home:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  away:    "bg-sky-500/15 text-sky-400 border-sky-500/30",
  neutral: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const GAME_TYPE_STYLES: Record<GameType, string> = {
  "non-district": "bg-gray-700/60 text-gray-400 border-gray-600",
  district:       "bg-mustang-red/15 text-mustang-red border-mustang-red/30",
  scrimmage:      "bg-amber-500/15 text-amber-400 border-amber-500/30",
  tournament:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
  playoffs:       "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function LocationBadge({ type }: { type: LocationType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border uppercase tracking-wide ${LOCATION_STYLES[type]}`}>
      {LOCATION_LABELS[type]}
    </span>
  );
}

function TypeBadge({ type }: { type: GameType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border uppercase tracking-wide ${GAME_TYPE_STYLES[type]}`}>
      {GAME_TYPE_LABELS[type]}
    </span>
  );
}

// ── Result chip ────────────────────────────────────────────────────────────

function ResultChip({ game }: { game: Game }) {
  const result = gameResult(game);
  if (result === "upcoming") {
    return <span className="text-gray-600 font-mono text-sm">—</span>;
  }
  const us   = game.score_us!;
  const them = game.score_them!;
  const isWin = result === "win";
  return (
    <span className={`font-mono text-sm font-bold ${isWin ? "text-emerald-400" : "text-mustang-red"}`}>
      {isWin ? "W" : "L"} {us}–{them}
    </span>
  );
}

// ── Writeup modal ──────────────────────────────────────────────────────────

function WriteupModal({ game, onClose }: { game: Game; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Game Writeup</h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {fmtDate(game.game_date).short} · {game.opponent}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {game.game_writeup ? (
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{game.game_writeup}</p>
          ) : (
            <p className="text-gray-600 font-mono text-xs">No writeup yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit modal ───────────────────────────────────────────────────────

type ModalMode = { type: "add" } | { type: "edit"; game: Game };

function GameModal({
  mode,
  teamId,
  onSave,
  onClose,
}: {
  mode: ModalMode;
  teamId: string | null;
  onSave: (g: Game) => void;
  onClose: () => void;
}) {
  const initial: GameDraft =
    mode.type === "edit"
      ? { ...mode.game }
      : { ...EMPTY_DRAFT, team_id: teamId };

  const [draft, setDraft] = useState<GameDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function patch<K extends keyof GameDraft>(key: K, value: GameDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    if (!draft.game_date) { setError("Date is required."); return; }
    if (!draft.opponent.trim()) { setError("Opponent name is required."); return; }
    setSaving(true);
    setError(null);

    const payload = {
      ...draft,
      game_time:      draft.game_time || null,
      highlights_url: draft.highlights_url || null,
      box_score_url:  draft.box_score_url  || null,
      game_writeup:   draft.game_writeup   || null,
      score_us:       draft.score_us   !== null && draft.score_us   !== undefined && String(draft.score_us)   !== "" ? Number(draft.score_us)   : null,
      score_them:     draft.score_them !== null && draft.score_them !== undefined && String(draft.score_them) !== "" ? Number(draft.score_them) : null,
    };

    const url    = mode.type === "edit" ? `/api/games/${mode.game.id}` : "/api/games";
    const method = mode.type === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setSaving(false); return; }
    onSave(data);
  }

  const inputCls = "bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors font-mono w-full";
  const labelCls = "text-[10px] font-mono text-gray-500 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-base">
            {mode.type === "add" ? "Add Game" : "Edit Game"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Game Info */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Game Info</p>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className={labelCls}>Date *</label>
                <input type="date" value={draft.game_date} onChange={(e) => patch("game_date", e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1 w-32">
                <label className={labelCls}>Time</label>
                <input type="time" value={draft.game_time ?? ""} onChange={(e) => patch("game_time", e.target.value || null)} className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Opponent *</label>
              <input
                type="text"
                value={draft.opponent}
                onChange={(e) => patch("opponent", e.target.value)}
                placeholder="e.g. EISD Lamar HS"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>Location</label>
              <div className="flex gap-2">
                {(["home", "away", "neutral"] as LocationType[]).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => patch("location_type", loc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                      draft.location_type === loc
                        ? "bg-mustang-red border-mustang-red text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {LOCATION_LABELS[loc]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>Game Type</label>
              <div className="flex gap-2 flex-wrap">
                {(["scrimmage", "non-district", "tournament", "district", "playoffs"] as GameType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch("game_type", t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      draft.game_type === t
                        ? "bg-mustang-red border-mustang-red text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {GAME_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Result — leave blank if not yet played</p>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className={labelCls}>Your Score</label>
                <input
                  type="number"
                  min={0}
                  value={draft.score_us ?? ""}
                  onChange={(e) => patch("score_us", e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className={labelCls}>Opponent Score</label>
                <input
                  type="number"
                  min={0}
                  value={draft.score_them ?? ""}
                  onChange={(e) => patch("score_them", e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Resources</p>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Highlights URL</label>
              <input
                type="url"
                value={draft.highlights_url ?? ""}
                onChange={(e) => patch("highlights_url", e.target.value || null)}
                placeholder="https://youtube.com/..."
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Box Score URL</label>
              <input
                type="url"
                value={draft.box_score_url ?? ""}
                onChange={(e) => patch("box_score_url", e.target.value || null)}
                placeholder="https://maxpreps.com/..."
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Game Writeup</label>
              <textarea
                value={draft.game_writeup ?? ""}
                onChange={(e) => patch("game_writeup", e.target.value || null)}
                placeholder="Recap of the game — key plays, standout performances, areas to improve…"
                rows={5}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors resize-none w-full"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-mustang-red hover:bg-mustang-red-dark text-white transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : "Save Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Game row ───────────────────────────────────────────────────────────────

function GameRow({
  game,
  onEdit,
  onDelete,
  onViewWriteup,
}: {
  game: Game;
  onEdit: () => void;
  onDelete: () => void;
  onViewWriteup: () => void;
}) {
  const { short, weekday } = fmtDate(game.game_date);
  const result = gameResult(game);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700/50 last:border-0 hover:bg-gray-800/30 transition-colors group">
      {/* Date */}
      <div className="w-24 shrink-0">
        <p className="text-white font-mono text-sm font-semibold">{short}</p>
        <p className="text-gray-600 font-mono text-[10px]">{weekday}{game.game_time ? ` · ${fmt12h(game.game_time)}` : ""}</p>
      </div>

      {/* Opponent */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{game.opponent}</p>
      </div>

      {/* Location */}
      <div className="w-20 shrink-0 hidden sm:block">
        <LocationBadge type={game.location_type} />
      </div>

      {/* Game type */}
      <div className="w-28 shrink-0 hidden md:block">
        <TypeBadge type={game.game_type} />
      </div>

      {/* Result */}
      <div className="w-20 shrink-0 text-right">
        <ResultChip game={game} />
        {result === "upcoming" && (
          <p className="text-[9px] font-mono text-gray-700 uppercase tracking-wider">Upcoming</p>
        )}
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-1 shrink-0 ml-1">
        {/* Scouting report — placeholder until section is built */}
        <span
          title="Scouting Report (coming soon)"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 cursor-not-allowed"
        >
          <Target size={14} />
        </span>

        {/* Highlights */}
        {game.highlights_url ? (
          <a
            href={game.highlights_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Watch Highlights"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sky-400 hover:bg-sky-400/10 transition-colors"
          >
            <Video size={14} />
          </a>
        ) : (
          <span title="No highlights" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700">
            <Video size={14} />
          </span>
        )}

        {/* Box Score */}
        {game.box_score_url ? (
          <a
            href={game.box_score_url}
            target="_blank"
            rel="noopener noreferrer"
            title="View Box Score"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        ) : (
          <span title="No box score" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700">
            <ExternalLink size={14} />
          </span>
        )}

        {/* Writeup */}
        <button
          onClick={onViewWriteup}
          title={game.game_writeup ? "View Game Writeup" : "No writeup yet"}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            game.game_writeup
              ? "text-amber-400 hover:bg-amber-400/10"
              : "text-gray-700 hover:text-gray-500"
          }`}
        >
          <FileText size={14} />
        </button>

        {/* Edit / Delete — show on hover */}
        <button
          onClick={onEdit}
          title="Edit game"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={onDelete}
          title="Delete game"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-mustang-red hover:bg-mustang-red/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GameSchedulePage() {
  const { activeTeam } = useTeam();
  const [games,   setGames]   = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [modal,        setModal]        = useState<ModalMode | null>(null);
  const [writeupGame,  setWriteupGame]  = useState<Game | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Game | null>(null);

  // Load games
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    fetch(`/api/games?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setGames(d);
      })
      .catch(() => setError("Failed to load schedule"))
      .finally(() => setLoading(false));
  }, [activeTeam]);

  // Record summary
  const { wins, losses, districtW, districtL, upcoming } = useMemo(() => {
    let wins = 0, losses = 0, districtW = 0, districtL = 0, upcoming = 0;
    for (const g of games) {
      const result = gameResult(g);
      if (result === "upcoming") { upcoming++; continue; }
      if (result === "win") { wins++; if (g.game_type === "district") districtW++; }
      else { losses++; if (g.game_type === "district") districtL++; }
    }
    return { wins, losses, districtW, districtL, upcoming };
  }, [games]);

  // Group by month
  const byMonth = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of games) {
      const month = fmtDate(g.game_date).month;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(g);
    }
    return Array.from(map.entries());
  }, [games]);

  function handleSaved(saved: Game) {
    setGames((prev) => {
      const idx = prev.findIndex((g) => g.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next.sort((a, b) => a.game_date.localeCompare(b.game_date));
      }
      return [...prev, saved].sort((a, b) => a.game_date.localeCompare(b.game_date));
    });
    setModal(null);
  }

  async function handleDelete(game: Game) {
    await fetch(`/api/games/${game.id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== game.id));
    setConfirmDelete(null);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Game Schedule</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {new Date().getFullYear()} SEASON
          </p>
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mustang-red hover:bg-mustang-red-dark text-white text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          Add Game
        </button>
      </div>

      {/* Record summary */}
      {games.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <Trophy size={16} className="text-mustang-red" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{wins}–{losses}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Overall Record</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <ClipboardList size={16} className="text-mustang-red" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{districtW}–{districtL}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">District Record</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <Target size={16} className="text-sky-400" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{upcoming}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Remaining</p>
            </div>
          </div>
        </div>
      )}

      {/* Column headers */}
      {games.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-mono text-gray-600 uppercase tracking-wider border-b border-gray-700 mb-0">
          <div className="w-24 shrink-0">Date</div>
          <div className="flex-1">Opponent</div>
          <div className="w-20 shrink-0 hidden sm:block">Location</div>
          <div className="w-28 shrink-0 hidden md:block">Type</div>
          <div className="w-20 shrink-0 text-right">Score</div>
          <div className="shrink-0 ml-1 flex gap-1">
            <span className="w-7 text-center" title="Scouting">Scout</span>
            <span className="w-7 text-center" title="Highlights">Film</span>
            <span className="w-7 text-center" title="Box Score">Box</span>
            <span className="w-7 text-center" title="Writeup">Notes</span>
            <span className="w-7" />
            <span className="w-7" />
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {loading && (
          <div className="py-16 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-mustang-red" />
          </div>
        )}
        {!loading && error && (
          <div className="py-16 text-center text-red-400 font-mono text-xs">{error}</div>
        )}
        {!loading && !error && games.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-500 font-mono text-xs mb-3">NO GAMES SCHEDULED</p>
            <button
              onClick={() => setModal({ type: "add" })}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
            >
              <Plus size={13} /> Add Your First Game
            </button>
          </div>
        )}

        {!loading && !error && byMonth.map(([month, monthGames]) => (
          <div key={month}>
            {/* Month divider */}
            <div className="px-4 py-2 bg-gray-900/60 border-b border-gray-700/50">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{month}</p>
            </div>
            {monthGames.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                onEdit={() => setModal({ type: "edit", game })}
                onDelete={() => setConfirmDelete(game)}
                onViewWriteup={() => setWriteupGame(game)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      {games.length > 0 && (
        <p className="text-[10px] font-mono text-gray-700 mt-3 text-right">
          Scout · Film · Box · Notes — colored icon = content available · hover row to edit
        </p>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <GameModal
          mode={modal}
          teamId={activeTeam?.id ?? null}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {/* Writeup modal */}
      {writeupGame && (
        <WriteupModal game={writeupGame} onClose={() => setWriteupGame(null)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-1">Delete this game?</h3>
            <p className="text-gray-400 text-sm mb-5">
              {fmtDate(confirmDelete.game_date).short} vs. {confirmDelete.opponent} will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-mustang-red hover:bg-mustang-red-dark text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
