"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Loader2, MapPin, X, Save, Home } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLocations } from "@/context/LocationsContext";
import type { Location, LocationDraft } from "@/types/location";
import { EMPTY_LOCATION_DRAFT } from "@/types/location";

type ModalMode = { type: "add" } | { type: "edit"; loc: Location };

function LocationModal({ mode, onSave, onClose }: { mode: ModalMode; onSave: (l: Location) => void; onClose: () => void }) {
  const initial: LocationDraft = mode.type === "edit" ? { ...mode.loc } : { ...EMPTY_LOCATION_DRAFT };
  const [draft, setDraft]   = useState<LocationDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function patch<K extends keyof LocationDraft>(key: K, val: LocationDraft[K]) { setDraft((d) => ({ ...d, [key]: val })); }

  async function handleSave() {
    if (!draft.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    const url    = mode.type === "edit" ? `/api/locations/${mode.loc.id}` : "/api/locations";
    const method = mode.type === "edit" ? "PATCH" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setSaving(false); return; }
    onSave(data);
  }

  const inputCls = "bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors font-mono w-full";
  const labelCls = "text-[10px] font-mono text-gray-500 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-base">{mode.type === "add" ? "Add Location" : "Edit Location"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Name *</label>
            <input type="text" value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="e.g. Memorial HS Gym" className={inputCls} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelCls}>Address</label>
              <input type="text" value={draft.address ?? ""} onChange={(e) => patch("address", e.target.value || null)} placeholder="1234 Main St" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1 w-32">
              <label className={labelCls}>Zip</label>
              <input type="text" value={draft.zip ?? ""} onChange={(e) => patch("zip", e.target.value || null)} placeholder="77001" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>City</label>
            <input type="text" value={draft.city ?? ""} onChange={(e) => patch("city", e.target.value || null)} placeholder="Houston" className={inputCls} />
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 w-40">
              <label className={labelCls}>Default Travel Time (min)</label>
              <input type="number" min={0} value={draft.default_travel_time} onChange={(e) => patch("default_travel_time", parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={draft.is_home_venue} onChange={(e) => patch("is_home_venue", e.target.checked)} className="w-4 h-4 rounded accent-coaches-red" />
              <span className="text-gray-300 text-xs font-medium">Home Venue</span>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Notes</label>
            <textarea value={draft.notes ?? ""} onChange={(e) => patch("notes", e.target.value || null)} placeholder="Parking info, gate code, etc." rows={2} className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors resize-none w-full" />
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

export default function LocationsPage() {
  const { locations, loading, addLocation, updateLocation, removeLocation } = useLocations();
  const [modal, setModal]               = useState<ModalMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null);
  const [deleting, setDeleting]           = useState(false);

  function handleSaved(loc: Location) {
    if (modal?.type === "edit") updateLocation(loc); else addLocation(loc);
    setModal(null);
  }

  async function handleDelete(loc: Location) {
    setDeleting(true);
    await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
    removeLocation(loc.id);
    setDeleting(false);
    setConfirmDelete(null);
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <h1 className="text-white text-2xl font-bold tracking-tight">Locations</h1>
        <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Location
        </button>
      </div>

      {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>}

      {!loading && locations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <MapPin size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No locations yet.</p>
        </div>
      )}

      {locations.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          {locations.map((loc, i) => {
            const mapsUrl = loc.address && loc.city
              ? `https://maps.google.com/maps?q=${encodeURIComponent(loc.address + ", " + loc.city + (loc.zip ? " " + loc.zip : ""))}`
              : null;
            return (
              <div key={loc.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < locations.length - 1 ? "border-b border-gray-700/50" : ""} hover:bg-gray-800/30 transition-colors group`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-semibold">{loc.name}</p>
                    {loc.is_home_venue && (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-1.5 py-0.5 rounded-full">
                        <Home size={8} /> Home
                      </span>
                    )}
                  </div>
                  {(loc.address || loc.city) && (
                    mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono text-coaches-blue hover:text-blue-300 transition-colors mt-0.5">
                        <MapPin size={9} />{[loc.address, loc.city, loc.zip].filter(Boolean).join(", ")}
                      </a>
                    ) : (
                      <p className="text-[11px] font-mono text-gray-500 mt-0.5">{[loc.address, loc.city, loc.zip].filter(Boolean).join(", ")}</p>
                    )
                  )}
                  {loc.notes && <p className="text-gray-600 text-[11px] mt-0.5 truncate">{loc.notes}</p>}
                </div>
                <div className="text-right shrink-0 w-24 hidden sm:block">
                  <p className="text-gray-400 text-xs font-mono">{loc.default_travel_time}m travel</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                  <button onClick={() => setModal({ type: "edit", loc })} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-gray-700 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => setConfirmDelete(loc)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-coaches-red hover:bg-coaches-red/10 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <LocationModal mode={modal} onSave={handleSaved} onClose={() => setModal(null)} />}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Location?</h3>
            <p className="text-gray-400 text-sm mb-6">Remove &quot;{confirmDelete.name}&quot; from the locations list?</p>
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
