"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Player, PlayerStatus } from "@/types/player";
import { NewPlayerData } from "@/context/PlayerContext";
import { useTeam } from "@/context/TeamContext";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

type FormData = NewPlayerData;

interface Props {
  /** When provided, the form is in edit mode and pre-fills from this player. */
  player?: Player;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}

const inputCls =
  "w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors";
const labelCls =
  "block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider";

export default function PlayerForm({ player, onSave, onClose }: Props) {
  const isEdit = Boolean(player);
  const { teams, activeTeam } = useTeam();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormData>({
    name:          player?.name          ?? "",
    jersey_number: player?.jersey_number ?? 0,
    position:      player?.position      ?? "PG",
    class_year:    player?.class_year    ?? "Freshman",
    status:        player?.status        ?? PlayerStatus.Active,
    titan_load:    player?.titan_load    ?? 0,
    team_id:       player?.team_id       ?? activeTeam?.id ?? null,
    email:         player?.email         ?? null,
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">
            {isEdit ? "Edit Player" : "Add Player"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Jordan Wallace"
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. player@email.com"
              className={inputCls}
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value || null)}
            />
            <p className="text-[10px] font-mono text-gray-600 mt-1">Used for future login and notifications. Optional.</p>
          </div>

          {/* Jersey + Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Jersey #</label>
              <input
                required
                type="number"
                min={0}
                max={99}
                className={inputCls}
                value={form.jersey_number}
                onChange={(e) => set("jersey_number", parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Position</label>
              <select
                className={inputCls}
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Year + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Class Year</label>
              <select
                className={inputCls}
                value={form.class_year}
                onChange={(e) => set("class_year", e.target.value)}
              >
                {CLASS_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => set("status", e.target.value as PlayerStatus)}
              >
                {Object.values(PlayerStatus).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Team */}
          {teams.length > 0 && (
            <div>
              <label className={labelCls}>Team</label>
              <select
                className={inputCls}
                value={form.team_id ?? ""}
                onChange={(e) => set("team_id", e.target.value || null)}
              >
                <option value="">— Unassigned —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Titan Load — only visible in edit mode */}
          {isEdit && (
            <div>
              <label className={labelCls}>Titan Load (AU)</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.titan_load}
                onChange={(e) => set("titan_load", parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Inline error */}
          {submitError && (
            <p className="text-mustang-red text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
