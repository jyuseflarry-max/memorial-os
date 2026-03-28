"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, Trash2, RefreshCw, CheckCircle2,
  AlertTriangle, X, Loader2, ShieldCheck, KeyRound,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ── Types ──────────────────────────────────────────────────────────────────

interface StaffMember {
  id:         string;
  full_name:  string | null;
  email:      string | null;
  role:       string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  Admin:   "text-coaches-red bg-coaches-red/10 border-coaches-red/20",
  Coach:   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Manager: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

// ── Add staff modal (invite) ───────────────────────────────────────────────

function AddStaffModal({ onAdd, onClose }: {
  onAdd: (full_name: string, email: string, role: string) => Promise<void>;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState("Coach");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onAdd(fullName.trim(), email.trim(), role);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl mx-4 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Invite Staff Member</p>
            <p className="text-gray-400 text-xs mt-0.5">They&apos;ll receive an email with a login link.</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Full Name</label>
            <input
              type="text" required value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
              placeholder="Coach Johnson"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
              placeholder="coach@school.edu"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Role</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
            >
              <option value="Coach">Coach</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-coaches-red disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add user manually modal ────────────────────────────────────────────────

function AddUserModal({ onAdd, onClose }: {
  onAdd: (full_name: string, email: string, role: string, password: string) => Promise<void>;
  onClose: () => void;
}) {
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [role,      setRole]      = useState("Coach");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onAdd(fullName.trim(), email.trim(), role, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl mx-4 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Add User</p>
            <p className="text-gray-400 text-xs mt-0.5">Account is created immediately — no email sent.</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Full Name</label>
            <input
              type="text" required value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
              placeholder="Coach Johnson"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
              placeholder="coach@school.edu"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Password</label>
            <input
              type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
              placeholder="Min 6 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Role</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors"
            >
              <option value="Coach">Coach</option>
              <option value="Manager">Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-coaches-red disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Set password modal ─────────────────────────────────────────────────────

function SetPasswordModal({ member, onClose }: {
  member: StaffMember;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${member.id}/set-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl mx-4 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Set Password</p>
            <p className="text-gray-400 text-xs mt-0.5">{member.full_name ?? member.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
            <CheckCircle2 size={14} className="shrink-0" /> Password updated — they can now log in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">New Password</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-blue transition-colors"
                placeholder="Min 6 characters"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-coaches-blue disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {saving ? "Saving…" : "Set Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff,     setStaff]     = useState<StaffMember[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [resending,    setResending]    = useState<string | null>(null);
  const [removing,     setRemoving]     = useState<string | null>(null);
  const [settingPwFor, setSettingPwFor] = useState<StaffMember | null>(null);
  const [showAddUser,    setShowAddUser]    = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load staff");
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectableStaff = staff.filter((m) => m.role !== "Admin");
  const allSelected = selectableStaff.length > 0 && selectableStaff.every((m) => selectedIds.has(m.id));
  const someSelected = !allSelected && selectableStaff.some((m) => selectedIds.has(m.id));

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await Promise.all([...selectedIds].map((id) => fetch(`/api/staff/${id}`, { method: "DELETE" })));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
    setBulkDeleting(false);
    await load();
  }

  async function handleAdd(full_name: string, email: string, role: string) {
    const res = await fetch("/api/staff", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ full_name, email, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Invite failed");
    await load();
  }

  async function handleAddUser(full_name: string, email: string, role: string, password: string) {
    const res = await fetch("/api/staff", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ full_name, email, role, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to create user");
    await load();
  }

  async function handleResend(id: string) {
    setResending(id);
    try {
      await fetch(`/api/staff/${id}`, { method: "POST" });
    } finally {
      setResending(null);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this staff member? They will lose access immediately.")) return;
    setRemoving(id);
    try {
      await fetch(`/api/staff/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-gray-400 text-sm font-mono mt-1">
            COACHES · MANAGERS · ADMIN · STAFF ONLY
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              <Trash2 size={15} /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          >
            <UserPlus size={16} /> Add User
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          >
            <UserPlus size={16} /> Invite Staff
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="pl-4 pr-2 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={(e) => setSelectedIds(e.target.checked ? new Set(selectableStaff.map((m) => m.id)) : new Set())}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
                />
              </th>
              {["Name", "Email", "Role", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500 font-mono text-xs">
                  LOADING…
                </td>
              </tr>
            )}
            {!loading && staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500 font-mono text-xs">
                  NO STAFF — INVITE YOUR FIRST COACH
                </td>
              </tr>
            )}
            {staff.map((member) => (
              <tr key={member.id}
                className={`border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors ${selectedIds.has(member.id) ? "bg-red-500/5" : ""}`}>
                <td className="pl-4 pr-2 py-3 w-10">
                  {member.role !== "Admin" && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={(e) => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(member.id); else next.delete(member.id);
                        return next;
                      })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{member.full_name ?? "—"}</p>
                    {member.role === "Admin" && (
                      <ShieldCheck size={13} className="text-coaches-red shrink-0" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {member.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wide border px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role] ?? "text-gray-400 bg-gray-700 border-gray-600"}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {member.role === "Admin" ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-green-400">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResend(member.id)}
                        disabled={resending === member.id}
                        title="Resend invite email"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold uppercase tracking-wide bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 transition-colors disabled:opacity-50"
                      >
                        {resending === member.id
                          ? <Loader2 size={10} className="animate-spin" />
                          : <RefreshCw size={10} />}
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingPwFor(member)}
                        title="Set password"
                        className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        disabled={removing === member.id}
                        title="Remove staff member"
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        {removing === member.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddStaffModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
      {showAddUser && <AddUserModal onAdd={handleAddUser} onClose={() => setShowAddUser(false)} />}
      {settingPwFor && <SetPasswordModal member={settingPwFor} onClose={() => setSettingPwFor(null)} />}

      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Remove {selectedIds.size} staff member{selectedIds.size !== 1 ? "s" : ""}?</p>
                <p className="text-gray-400 text-sm">They will lose access immediately. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowBulkDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {bulkDeleting ? "Removing…" : "Remove All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
