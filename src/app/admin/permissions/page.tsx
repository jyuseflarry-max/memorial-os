"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────

type AccessLevel = "none" | "view" | "edit" | "full";

type PermissionMatrix = Record<string, Record<string, AccessLevel>>;

// ── Page metadata ─────────────────────────────────────────────────────────

const PAGE_META: { key: string; label: string; section: "main" | "family" }[] = [
  { key: "messages",          label: "Messages",          section: "main" },
  { key: "roster",            label: "Roster",            section: "main" },
  { key: "readiness",         label: "Readiness",         section: "main" },
  { key: "player_groups",     label: "Player Groups",     section: "main" },
  { key: "build_plan",        label: "Build a Plan",      section: "main" },
  { key: "view_plans",        label: "View Plans",        section: "main" },
  { key: "drill_vault",       label: "Drill Vault",       section: "main" },
  { key: "reports",           label: "Practice Reports",  section: "main" },
  { key: "attendance_report", label: "Attendance Report", section: "main" },
  { key: "game_schedule",     label: "Game Schedule",     section: "main" },
  { key: "practice_schedule", label: "Practice Schedule", section: "main" },
  { key: "weekly_schedule",   label: "Weekly Schedule",   section: "main" },
  { key: "strength",          label: "Strength",          section: "main" },
  { key: "leaderboard",       label: "Leaderboard",       section: "main" },
  { key: "strength_programs", label: "S&C Programs",      section: "main" },
  { key: "inventory",         label: "Inventory",         section: "main" },
  { key: "inventory_audit",   label: "Inventory Audit",   section: "main" },
  { key: "settings",          label: "Admin Settings",    section: "main" },
  { key: "family_schedule",   label: "Schedule",          section: "family" },
  { key: "family_games",      label: "Games",             section: "family" },
  { key: "family_messages",   label: "Messages",          section: "family" },
];

const EDITABLE_ROLES = ["Coach", "Manager", "Player", "Family"] as const;
const ALL_LEVELS: AccessLevel[] = ["none", "view", "edit", "full"];

// ── Level pill styles ─────────────────────────────────────────────────────

const LEVEL_STYLES: Record<AccessLevel, string> = {
  none: "bg-gray-700 text-gray-400 border-gray-600",
  view: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  edit: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  full: "bg-green-500/20 text-green-300 border-green-500/40",
};

const LEVEL_ACTIVE_STYLES: Record<AccessLevel, string> = {
  none: "bg-gray-600 text-gray-200 border-gray-500 ring-1 ring-gray-400",
  view: "bg-sky-500/40 text-sky-200 border-sky-400 ring-1 ring-sky-400",
  edit: "bg-amber-500/40 text-amber-200 border-amber-400 ring-1 ring-amber-400",
  full: "bg-green-500/40 text-green-200 border-green-400 ring-1 ring-green-400",
};

// ── Level cell component ──────────────────────────────────────────────────

function LevelCell({
  pageKey,
  role,
  level,
  editable,
  onchange,
}: {
  pageKey: string;
  role: string;
  level: AccessLevel;
  editable: boolean;
  onchange: (pageKey: string, role: string, newLevel: AccessLevel) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {ALL_LEVELS.map((l) => {
        const isActive = level === l;
        return (
          <button
            key={l}
            type="button"
            disabled={!editable}
            onClick={() => editable && onchange(pageKey, role, l)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-all
              ${isActive ? LEVEL_ACTIVE_STYLES[l] : LEVEL_STYLES[l]}
              ${editable ? "cursor-pointer hover:opacity-90" : "cursor-default opacity-70"}`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ── Admin locked cell ─────────────────────────────────────────────────────

function AdminLockedCell() {
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-green-500/10 text-green-600 border border-green-500/20 opacity-60">
      full (locked)
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { isAdmin, authUser } = useAuth();
  const canEdit = isAdmin;
  const canView = authUser?.role === "Admin" || authUser?.role === "Coach" || authUser?.role === "Manager";

  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // "pageKey:role"

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/page-permissions");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load permissions");
        return;
      }
      const data: PermissionMatrix = await res.json();
      setMatrix(data);
    } catch {
      setError("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleChange(pageKey: string, role: string, newLevel: AccessLevel) {
    if (!canEdit) return;
    const key = `${pageKey}:${role}`;
    // Optimistic update
    setMatrix((prev) => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], [role]: newLevel },
    }));
    setSaving(key);
    try {
      const res = await fetch("/api/admin/page-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_key: pageKey, role, access_level: newLevel }),
      });
      if (!res.ok) {
        // Roll back on failure
        await load();
      }
    } catch {
      await load();
    } finally {
      setSaving(null);
    }
  }

  const mainPages   = PAGE_META.filter((p) => p.section === "main");
  const familyPages = PAGE_META.filter((p) => p.section === "family");

  if (!canView) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-500 text-sm font-mono">You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Page Permissions</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">
              {canEdit ? "CONFIGURE ROLE ACCESS — ADMIN ONLY EDITS" : "READ-ONLY VIEW"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm font-mono">
            <div className="w-4 h-4 rounded-full border-2 border-gray-600 border-t-gray-300 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {[
              { label: "Main App", pages: mainPages },
              { label: "Family Portal", pages: familyPages },
            ].map(({ label, pages }) => (
              <div key={label}>
                <h2 className="text-white font-semibold text-sm mb-3">{label}</h2>

                <div className="overflow-x-auto rounded-2xl border border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/60">
                        <th className="text-left px-4 py-3 text-xs font-mono text-gray-400 uppercase tracking-wider w-44">
                          Page
                        </th>
                        {/* Admin locked column */}
                        <th className="text-left px-4 py-3 text-xs font-mono text-gray-400 uppercase tracking-wider">
                          Admin
                        </th>
                        {EDITABLE_ROLES.map((role) => (
                          <th
                            key={role}
                            className="text-left px-4 py-3 text-xs font-mono text-gray-400 uppercase tracking-wider"
                          >
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map(({ key, label: pageLabel }, idx) => (
                        <tr
                          key={key}
                          className={`border-b border-gray-800 ${idx % 2 === 0 ? "bg-gray-900" : "bg-gray-850"} hover:bg-gray-800/40 transition-colors`}
                        >
                          <td className="px-4 py-3 text-white text-xs font-medium whitespace-nowrap">
                            {pageLabel}
                          </td>
                          {/* Admin column — always locked full */}
                          <td className="px-4 py-3">
                            <AdminLockedCell />
                          </td>
                          {EDITABLE_ROLES.map((role) => {
                            const currentLevel = (matrix[key]?.[role] ?? "none") as AccessLevel;
                            const isSaving = saving === `${key}:${role}`;
                            return (
                              <td key={role} className="px-4 py-3">
                                <div className={`transition-opacity ${isSaving ? "opacity-50" : "opacity-100"}`}>
                                  <LevelCell
                                    pageKey={key}
                                    role={role}
                                    level={currentLevel}
                                    editable={canEdit}
                                    onchange={handleChange}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {!canEdit && !loading && (
          <p className="mt-6 text-gray-600 text-xs font-mono">
            Only Admins can modify page permissions.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
