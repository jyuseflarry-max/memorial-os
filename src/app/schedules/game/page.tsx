"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Edit2, Trash2, ExternalLink, FileText, Video,
  X, Save, Loader2, Trophy, ClipboardList, Target,
  Upload, CheckCircle2, AlertCircle, MapPin,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import BulkImportModal from "@/components/BulkImportModal";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import { useLocations } from "@/context/LocationsContext";
import type { Game, LocationType, GameType, GameDraft } from "@/types/game";
import { LOCATION_LABELS, GAME_TYPE_LABELS, EMPTY_DRAFT } from "@/types/game";
import { seasonOptions } from "@/types/settings";
import { formatHHMM } from "@/types/session";

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
  district:       "bg-coaches-red/15 text-coaches-red border-coaches-red/30",
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
    <span className={`font-mono text-sm font-bold ${isWin ? "text-emerald-400" : "text-coaches-red"}`}>
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

// ── Box score upload widget (edit mode only) ───────────────────────────────

type UploadState = "idle" | "uploading" | "done" | "error";

function BoxScoreUpload({
  gameId,
  currentUrl,
  onUpdated,
}: {
  gameId: string;
  currentUrl: string | null;
  onUpdated: (url: string | null) => void;
}) {
  const fileRef                          = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState]    = useState<UploadState>("idle");
  const [uploadError, setUploadError]    = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState("uploading");
    setUploadError(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/games/${gameId}/box-score`, { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      setUploadState("error");
      setUploadError(data.error ?? "Upload failed");
      return;
    }
    setUploadState("done");
    onUpdated(data.box_score_url);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRemove() {
    setUploadState("uploading");
    const res = await fetch(`/api/games/${gameId}/box-score`, { method: "DELETE" });
    if (res.ok) {
      setUploadState("idle");
      onUpdated(null);
    } else {
      setUploadState("error");
      setUploadError("Remove failed");
    }
  }

  const hasFile = !!currentUrl;

  return (
    <div className="flex flex-col gap-2">
      {hasFile ? (
        <div className="flex items-center gap-3 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span className="text-emerald-400 text-xs font-mono flex-1 truncate">box-score.pdf uploaded</span>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors shrink-0"
          >
            View
          </a>
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploadState === "uploading"}
            className="text-xs font-semibold text-gray-500 hover:text-coaches-red transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadState === "uploading"}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors text-xs font-semibold disabled:opacity-50"
        >
          {uploadState === "uploading" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          {uploadState === "uploading" ? "Uploading…" : "Upload PDF Box Score"}
        </button>
      )}

      {uploadState === "error" && uploadError && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs font-mono">
          <AlertCircle size={12} /> {uploadError}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── Add / Edit modal ───────────────────────────────────────────────────────

function GameModal({
  mode,
  teamId,
  defaultSeason,
  onSave,
  onClose,
}: {
  mode: ModalMode;
  teamId: string | null;
  defaultSeason: string;
  onSave: (g: Game) => void;
  onClose: () => void;
}) {
  const initial: GameDraft =
    mode.type === "edit"
      ? { ...mode.game }
      : { ...EMPTY_DRAFT, team_id: teamId, season: defaultSeason };

  const { locations } = useLocations();
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
      game_time:      draft.time_tbd ? null : (draft.game_time || null),
      time_tbd:       draft.time_tbd ?? false,
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

  const inputCls = "bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors font-mono w-full";
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
              <div className="flex flex-col gap-1 w-44">
                <label className={labelCls}>Time</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={draft.game_time ?? ""}
                    disabled={draft.time_tbd}
                    onChange={(e) => patch("game_time", e.target.value || null)}
                    className={`${inputCls} flex-1 disabled:opacity-40 disabled:cursor-not-allowed`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      patch("time_tbd", !draft.time_tbd);
                      if (!draft.time_tbd) patch("game_time", null);
                    }}
                    className={`shrink-0 px-2.5 py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                      draft.time_tbd
                        ? "bg-coaches-red border-coaches-red text-white"
                        : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    TBD
                  </button>
                </div>
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

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Game Note <span className="normal-case tracking-normal text-gray-600">(e.g. Senior Night, Alumni Game)</span></label>
              <input
                type="text"
                value={draft.game_note ?? ""}
                onChange={(e) => patch("game_note", e.target.value || null)}
                placeholder="e.g. Senior Night"
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Venue <span className="normal-case tracking-normal text-gray-600">(for directions)</span></label>
              <select
                value={draft.venue ?? ""}
                onChange={(e) => patch("venue", e.target.value || null)}
                className={inputCls + " appearance-none"}
              >
                <option value="">— Select a location —</option>
                {locations.map((l) => {
                  const full = [l.name, l.address, l.city].filter(Boolean).join(", ");
                  return (
                    <option key={l.id} value={full}>
                      {l.name}{l.is_home_venue ? " (Home)" : ""}{l.city ? ` · ${l.city}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Season</label>
              <select
                value={draft.season}
                onChange={(e) => patch("season", e.target.value)}
                className={inputCls + " appearance-none"}
              >
                {seasonOptions().map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
                        ? "bg-coaches-red border-coaches-red text-white"
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
                        ? "bg-coaches-red border-coaches-red text-white"
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
              <label className={labelCls}>Box Score (PDF)</label>
              {mode.type === "edit" ? (
                <BoxScoreUpload
                  gameId={mode.game.id}
                  currentUrl={draft.box_score_url}
                  onUpdated={(url) => patch("box_score_url", url)}
                />
              ) : (
                <p className="text-[10px] font-mono text-gray-600 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5">
                  Save the game first, then edit it to upload a box score PDF.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Game Writeup</label>
              <textarea
                value={draft.game_writeup ?? ""}
                onChange={(e) => patch("game_writeup", e.target.value || null)}
                placeholder="Recap of the game — key plays, standout performances, areas to improve…"
                rows={5}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors resize-none w-full"
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-coaches-red hover:bg-coaches-red-dark text-white transition-colors disabled:opacity-50"
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
  primaryColor,
  onEdit,
  onDelete,
  onViewWriteup,
  selected,
  onSelect,
}: {
  game: Game;
  primaryColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onViewWriteup: () => void;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const { short, weekday } = fmtDate(game.game_date);
  const result = gameResult(game);

  const opponentCls = game.game_type === "district"
    ? "text-white text-sm font-bold uppercase tracking-wide truncate"
    : game.game_type === "tournament"
    ? "text-white text-sm font-medium italic truncate"
    : "text-white text-sm font-medium truncate";

  const rowBg = game.location_type === "home"
    ? { backgroundColor: primaryColor + "18" }
    : undefined;

  const venueUrl = game.venue
    ? `https://maps.google.com/maps?q=${encodeURIComponent(game.venue)}`
    : null;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-700/50 last:border-0 hover:bg-gray-800/30 transition-colors group ${selected ? "bg-red-500/5" : ""}`}
      style={rowBg}
    >
      {/* Checkbox */}
      <div className="shrink-0 pt-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
        />
      </div>
      {/* Date */}
      <div className="w-24 shrink-0 pt-0.5">
        <p className="text-white font-mono text-sm font-semibold">{short}</p>
        <p className="text-gray-600 font-mono text-[10px]">{weekday}{game.time_tbd ? " · TBD" : game.game_time ? ` · ${fmt12h(game.game_time)}` : ""}</p>
      </div>

      {/* Opponent + sub-info */}
      <div className="flex-1 min-w-0">
        {/* Opponent + chips on same line */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className={opponentCls}>{game.opponent}</p>
          <LocationBadge type={game.location_type} />
          <TypeBadge type={game.game_type} />
        </div>

        {game.game_note && (
          <p className="text-[10px] font-mono text-purple-400 mt-0.5">{game.game_note}</p>
        )}

        {/* Venue */}
        {game.venue && venueUrl && (
          <a
            href={venueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-coaches-blue transition-colors mt-0.5 truncate"
          >
            <MapPin size={9} />
            {game.venue}
          </a>
        )}

        {/* Content links — always visible, dimmed when no content */}
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] font-mono text-gray-700 cursor-default" title="Scouting Report (coming soon)">
            <Target size={10} /> Scout
          </span>
          {game.highlights_url ? (
            <a
              href={game.highlights_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Video size={10} /> Highlights
            </a>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-700 cursor-default">
              <Video size={10} /> Highlights
            </span>
          )}
          {game.box_score_url ? (
            <a
              href={game.box_score_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink size={10} /> Box Score
            </a>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-700 cursor-default">
              <ExternalLink size={10} /> Box Score
            </span>
          )}
          {game.game_writeup ? (
            <button onClick={onViewWriteup} className="flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors">
              <FileText size={10} /> Writeup
            </button>
          ) : (
            <button onClick={onViewWriteup} className="flex items-center gap-1 text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">
              <FileText size={10} /> Writeup
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      <div className="w-20 shrink-0 text-right pt-0.5">
        <ResultChip game={game} />
        {result === "upcoming" && (
          <p className="text-[9px] font-mono text-gray-700 uppercase tracking-wider">Upcoming</p>
        )}
      </div>

      {/* Edit / Delete — show on hover */}
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
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
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-coaches-red hover:bg-coaches-red/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GameSchedulePage() {
  const { activeTeam }  = useTeam();
  const { settings }    = useSettings();
  const [games,   setGames]   = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Active season filter — defaults to the program's current season
  const [activeSeason, setActiveSeason] = useState<string | "all">(settings.current_season);

  // Keep default in sync if settings load after first render
  useEffect(() => {
    setActiveSeason(settings.current_season);
  }, [settings.current_season]);

  const [modal,         setModal]         = useState<ModalMode | null>(null);
  const [writeupGame,   setWriteupGame]   = useState<Game | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Game | null>(null);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);
  const [showCsvImport,  setShowCsvImport]  = useState(false);

  // Load ALL games for the team — filter client-side so season switching is instant
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

  // Seasons that actually have games (for the filter bar)
  const seasonsWithGames = useMemo(() => {
    const set = new Set(games.map((g) => g.season).filter(Boolean));
    // Always include the current season even if empty
    set.add(settings.current_season);
    // Sort newest first using seasonOptions order
    return seasonOptions().filter((s) => set.has(s));
  }, [games, settings.current_season]);

  // Games visible under the active season filter
  const visibleGames = useMemo(() =>
    activeSeason === "all" ? games : games.filter((g) => g.season === activeSeason),
  [games, activeSeason]);

  // Record summary for visible games — scrimmages excluded from all record counts
  const { wins, losses, districtW, districtL, upcoming, homeW, homeL, awayW, awayL, neutralW, neutralL } = useMemo(() => {
    let wins = 0, losses = 0, districtW = 0, districtL = 0, upcoming = 0;
    let homeW = 0, homeL = 0, awayW = 0, awayL = 0, neutralW = 0, neutralL = 0;
    for (const g of visibleGames) {
      const result = gameResult(g);
      if (result === "upcoming") { upcoming++; continue; }
      if (g.game_type === "scrimmage") continue; // scrimmages never affect record
      if (result === "win") {
        wins++;
        if (g.game_type === "district") districtW++;
        if (g.location_type === "home") homeW++;
        else if (g.location_type === "away") awayW++;
        else neutralW++;
      } else {
        losses++;
        if (g.game_type === "district") districtL++;
        if (g.location_type === "home") homeL++;
        else if (g.location_type === "away") awayL++;
        else neutralL++;
      }
    }
    return { wins, losses, districtW, districtL, upcoming, homeW, homeL, awayW, awayL, neutralW, neutralL };
  }, [visibleGames]);

  // Group visible games by month
  const byMonth = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of visibleGames) {
      const month = fmtDate(g.game_date).month;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(g);
    }
    return Array.from(map.entries());
  }, [visibleGames]);

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

  const allVisibleSelected = visibleGames.length > 0 && visibleGames.every((g) => selectedIds.has(g.id));
  const someVisibleSelected = !allVisibleSelected && visibleGames.some((g) => selectedIds.has(g.id));

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await Promise.all([...selectedIds].map((id) => fetch(`/api/games/${id}`, { method: "DELETE" })));
    setGames((prev) => prev.filter((g) => !selectedIds.has(g.id)));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
    setBulkDeleting(false);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Game Schedule</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {activeSeason === "all" ? "ALL SEASONS" : activeSeason}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <Trash2 size={15} /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCsvImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            <Upload size={15} />
            Import CSV
          </button>
          <button
            onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors"
          >
            <Plus size={15} />
            Add Game
          </button>
        </div>
      </div>

      {/* Season filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {seasonsWithGames.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSeason(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors font-mono ${
              activeSeason === s
                ? "bg-coaches-red border-coaches-red text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
            }`}
          >
            {s}
            {s === settings.current_season && (
              <span className="ml-1.5 text-[9px] opacity-60">current</span>
            )}
          </button>
        ))}
        {games.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveSeason("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors font-mono ${
              activeSeason === "all"
                ? "bg-coaches-red border-coaches-red text-white"
                : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
            }`}
          >
            All Seasons
          </button>
        )}
      </div>

      {/* Record summary */}
      {visibleGames.length > 0 && (
        <>
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <Trophy size={16} className="text-coaches-red" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{wins}–{losses}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Overall Record</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <ClipboardList size={16} className="text-coaches-red" />
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
          <div className="bg-gray-800 border border-emerald-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500/60 shrink-0" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{homeW}–{homeL}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Home</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-sky-700/40 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-500/60 shrink-0" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{awayW}–{awayL}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Away</p>
            </div>
          </div>
          {(neutralW + neutralL) > 0 && (
            <div className="bg-gray-800 border border-gray-600/40 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-500/60 shrink-0" />
              <div>
                <p className="text-white font-bold font-mono text-lg">{neutralW}–{neutralL}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Neutral</p>
              </div>
            </div>
          )}
        </div>
        <p className="text-[10px] font-mono text-gray-600 -mt-3 mb-3">
          * Scrimmages are not counted in the record.
        </p>
        </>
      )}

      {/* Column headers */}
      {visibleGames.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-mono text-gray-600 uppercase tracking-wider border-b border-gray-700 mb-0">
          <div className="shrink-0">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
              onChange={(e) => setSelectedIds(e.target.checked ? new Set(visibleGames.map((g) => g.id)) : new Set())}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
            />
          </div>
          <div className="w-24 shrink-0">Date</div>
          <div className="flex-1">Opponent</div>
          <div className="w-20 shrink-0 text-right">Result</div>
          <div className="w-16 shrink-0" />
        </div>
      )}

      {/* Schedule */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {loading && (
          <div className="py-16 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-coaches-red" />
          </div>
        )}
        {!loading && error && (
          <div className="py-16 text-center text-red-400 font-mono text-xs">{error}</div>
        )}
        {!loading && !error && visibleGames.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-500 font-mono text-xs mb-3">
              {games.length === 0 ? "NO GAMES SCHEDULED" : `NO GAMES FOR ${activeSeason === "all" ? "ANY SEASON" : activeSeason}`}
            </p>
            <button
              onClick={() => setModal({ type: "add" })}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
            >
              <Plus size={13} /> Add Game
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
                primaryColor={settings.primary_color}
                onEdit={() => setModal({ type: "edit", game })}
                onDelete={() => setConfirmDelete(game)}
                onViewWriteup={() => setWriteupGame(game)}
                selected={selectedIds.has(game.id)}
                onSelect={(checked) => setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(game.id); else next.delete(game.id);
                  return next;
                })}
              />
            ))}
          </div>
        ))}
      </div>


      {/* Add / Edit modal */}
      {modal && (
        <GameModal
          mode={modal}
          teamId={activeTeam?.id ?? null}
          defaultSeason={activeSeason === "all" ? settings.current_season : activeSeason}
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
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-coaches-red hover:bg-coaches-red-dark text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import modal */}
      {showCsvImport && (
        <BulkImportModal
          teamId={activeTeam?.id ?? null}
          onClose={() => setShowCsvImport(false)}
          onImported={() => {
            const params = new URLSearchParams();
            if (activeTeam) params.set("team_id", activeTeam.id);
            fetch(`/api/games?${params}`)
              .then((r) => r.json())
              .then((d) => { if (!d.error) setGames(d); })
              .catch(() => {});
          }}
        />
      )}

      {/* Bulk delete confirm */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete {selectedIds.size} game{selectedIds.size !== 1 ? "s" : ""}?</p>
                <p className="text-gray-400 text-sm">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowBulkDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {bulkDeleting ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
