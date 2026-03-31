"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Building2, X, Save, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useFacilities } from "@/context/FacilitiesContext";
import type { Facility } from "@/app/api/facilities/route";

type ModalMode = { type: "add" } | { type: "edit"; facility: Facility };

function FacilityModal({ mode, onSave, onClose }: { mode: ModalMode; onSave: (f: Facility) => void; onClose: () => void }) {
  const initial = mode.type === "edit" ? mode.facility.name : "";
  const [name,   setName]   = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    const url    = mode.type === "edit" ? `/api/facilities/${mode.facility.id}` : "/api/facilities";
    const method = mode.type === "edit" ? "PATCH" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setSaving(false); return; }
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-base">{mode.type === "add" ? "Add Facility" : "Edit Facility"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gym 1"
              autoFocus
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors font-mono w-full"
            />
          </div>
          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-coaches-red hover:bg-coaches-red-dark text-white disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacilitiesPage() {
  const { facilities, loading, error, addFacility, updateFacility, removeFacility } = useFacilities();
  const [modal,         setModal]         = useState<ModalMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  function handleSaved(f: Facility) {
    if (modal?.type === "edit") updateFacility(f); else addFacility(f);
    setModal(null);
  }

  async function handleDelete(f: Facility) {
    setDeleting(true);
    await fetch(`/api/facilities/${f.id}`, { method: "DELETE" });
    removeFacility(f.id);
    setDeleting(false);
    setConfirmDelete(null);
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Facilities</h1>
          <p className="text-gray-500 text-sm font-mono mt-0.5">On-campus locations used when scheduling practices.</p>
        </div>
        <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Facility
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="shrink-0" /><span>{error}</span>
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>}

      {!loading && facilities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Building2 size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No facilities yet.</p>
        </div>
      )}

      {facilities.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          {facilities.map((f, i) => (
            <div key={f.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < facilities.length - 1 ? "border-b border-gray-700/50" : ""} hover:bg-gray-800/30 transition-colors group`}>
              <Building2 size={15} className="text-gray-600 shrink-0" />
              <p className="flex-1 text-white text-sm font-semibold">{f.name}</p>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                <button onClick={() => setModal({ type: "edit", facility: f })} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-gray-700 transition-colors"><Edit2 size={13} /></button>
                <button onClick={() => setConfirmDelete(f)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-coaches-red hover:bg-coaches-red/10 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <FacilityModal mode={modal} onSave={handleSaved} onClose={() => setModal(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Facility?</h3>
            <p className="text-gray-400 text-sm mb-6">Remove &quot;{confirmDelete.name}&quot; from the facilities list?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
