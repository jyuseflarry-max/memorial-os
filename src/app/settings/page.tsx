"use client";

import { useState, useEffect, useRef } from "react";
import { Save, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useSettings } from "@/context/SettingsContext";
import { useDrillCategories } from "@/context/DrillCategoryContext";
import { seasonOptions, currentSeasonLabel } from "@/types/settings";

type SaveStatus = "idle" | "saving" | "saved";

export default function SettingsPage() {
  const { settings, loading, save } = useSettings();
  const { categories: drillCategories, addCategory, removeCategory, updateColor } = useDrillCategories();
  const [newCatName, setNewCatName] = useState("");
  const [newCatIsRest, setNewCatIsRest] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [form, setForm] = useState(settings);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync form when settings load from server
  useEffect(() => {
    if (!loading) setForm(settings);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setStatus("saving");
    await save({
      program_name:        form.program_name,
      logo_url:            form.logo_url,
      current_season:      form.current_season,
      season_start:        form.season_start || null,
      print_orientation:   form.print_orientation,
      default_start_time:  form.default_start_time,
      primary_color:       form.primary_color,
      primary_color_dark:  form.primary_color_dark,
      enabled_modules:     form.enabled_modules,
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }

  // Sync hex text input → color picker (validate format first)
  function handleHexInput(key: "primary_color" | "primary_color_dark", raw: string) {
    patch(key, raw);
  }

  // Logo file → base64 (store as data URL for simplicity; swap for S3/Supabase Storage upload later)
  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
      patch("logo_url", url);
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoPreview(null);
    patch("logo_url", null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="text-mustang-red animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const displayLogo = logoPreview ?? form.logo_url;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Program Settings</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">CONFIGURE YOUR PROGRAM</p>
          </div>
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors ${
              status === "saved"
                ? "bg-green-600/20 border border-green-600/40 text-green-400"
                : status === "saving"
                ? "bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed opacity-60"
                : "bg-mustang-red hover:bg-mustang-red-dark text-white"
            }`}
          >
            {status === "saving" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : status === "saved" ? (
              <CheckCircle2 size={15} />
            ) : (
              <Save size={15} />
            )}
            {status === "saved" ? "Saved!" : status === "saving" ? "Saving…" : "Save Settings"}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Program Identity */}
          <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider font-mono border-b border-gray-700 pb-3">
              Program Identity
            </h2>

            {/* Program Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Program Name</label>
              <input
                type="text"
                value={form.program_name}
                onChange={(e) => patch("program_name", e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors"
                placeholder="Memorial Basketball OS"
              />
              <p className="text-[10px] font-mono text-gray-600">Shown in the sidebar header and printed plans.</p>
            </div>

            {/* Logo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Program Logo</label>
              <div className="flex items-center gap-4">
                {displayLogo ? (
                  <div className="relative w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayLogo} alt="Program logo" className="w-full h-full object-contain" />
                    <button
                      onClick={clearLogo}
                      className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 text-white"
                      title="Remove logo"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-700 border-2 border-dashed border-gray-600 flex items-center justify-center shrink-0">
                    <Upload size={18} className="text-gray-500" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors"
                  >
                    {displayLogo ? "Change Logo" : "Upload Logo"}
                  </button>
                  <p className="text-[10px] font-mono text-gray-600">PNG or SVG recommended. Stored as base64.</p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFile}
              />
            </div>
          </section>

          {/* Data & Reporting */}
          <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider font-mono border-b border-gray-700 pb-3">
              Data & Reporting
            </h2>

            {/* Current Season */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Current Season</label>
              <select
                value={form.current_season}
                onChange={(e) => patch("current_season", e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors font-mono w-fit appearance-none pr-8"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
              >
                {seasonOptions().map((s) => (
                  <option key={s} value={s}>
                    {s}{s === currentSeasonLabel() ? "  ← current" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-mono text-gray-600">
                Labels all data, schedules, and reports for this season. Changing seasons lets you backload historical data or plan ahead.
              </p>
            </div>

            {/* Season Start */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Season Start Date</label>
              <input
                type="date"
                value={form.season_start ?? ""}
                onChange={(e) => patch("season_start", e.target.value || null)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors font-mono w-fit"
              />
              <p className="text-[10px] font-mono text-gray-600">
                Drill usage (Last Used, use count) and reports will only include data on or after this date.
                Leave blank to show all historical data.
              </p>
            </div>

            {/* Print Orientation */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Print Orientation</label>
              <div className="flex gap-3">
                {(["portrait", "landscape"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => patch("print_orientation", opt)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                      form.print_orientation === opt
                        ? "bg-mustang-red border-mustang-red text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-mono text-gray-600">Applied to the practice plan print stylesheet.</p>
            </div>
          </section>

          {/* Practice Defaults */}
          <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider font-mono border-b border-gray-700 pb-3">
              Practice Defaults
            </h2>

            {/* Default Start Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Default Practice Start Time</label>
              <input
                type="time"
                value={form.default_start_time}
                onChange={(e) => patch("default_start_time", e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors font-mono w-fit"
              />
              <p className="text-[10px] font-mono text-gray-600">Pre-filled start time when creating a new practice plan.</p>
            </div>
          </section>

          {/* Module Visibility */}
          <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
            <div className="border-b border-gray-700 pb-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider font-mono">Module Visibility</h2>
              <p className="text-[10px] font-mono text-gray-500 mt-1">Control which sections appear in the sidebar. Hidden modules are preserved — just not shown.</p>
            </div>
            {["Players", "Practice", "Reports", "Schedules", "Strength"].map((mod) => {
              const enabled = (form.enabled_modules ?? []).includes(mod);
              return (
                <div key={mod} className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{mod}</span>
                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        "enabled_modules",
                        enabled
                          ? (form.enabled_modules ?? []).filter((m) => m !== mod)
                          : [...(form.enabled_modules ?? []), mod]
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      enabled ? "bg-mustang-red" : "bg-gray-600"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              );
            })}
          </section>

          {/* Drill Categories */}
          <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
            <div className="border-b border-gray-700 pb-3">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider font-mono">Drill Categories</h2>
              <p className="text-[10px] font-mono text-gray-500 mt-1">Each category gets a unique color used across the Planner, Vault, and Analytics.</p>
            </div>

            {/* Category list */}
            <div className="flex flex-col gap-2">
              {drillCategories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3">
                  {/* Color swatch / picker */}
                  <label
                    className="w-8 h-8 rounded-lg border-2 border-gray-600 cursor-pointer shrink-0 overflow-hidden"
                    style={{ backgroundColor: cat.color }}
                    title="Click to change color"
                  >
                    <input
                      type="color"
                      value={cat.color}
                      onChange={(e) => updateColor(cat.id, e.target.value)}
                      className="opacity-0 w-0 h-0"
                    />
                  </label>

                  {/* Name */}
                  <span className="text-white text-sm flex-1 truncate">{cat.name}</span>

                  {/* REST badge */}
                  {cat.is_rest && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-px rounded bg-sky-900/60 text-sky-400 border border-sky-700/40 shrink-0">
                      REST
                    </span>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
                      removeCategory(cat.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                    title="Delete category"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {drillCategories.length === 0 && (
                <p className="text-gray-600 text-xs font-mono">No categories yet. Add one below.</p>
              )}
            </div>

            {/* New category form */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-700 flex-wrap">
              <input
                type="text"
                placeholder="Category name…"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCatName.trim()) {
                    e.preventDefault();
                    setAddingCat(true);
                    addCategory(newCatName.trim(), newCatIsRest).finally(() => {
                      setNewCatName("");
                      setNewCatIsRest(false);
                      setAddingCat(false);
                    });
                  }
                }}
                className="flex-1 min-w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors"
              />

              {/* is_rest toggle */}
              <button
                type="button"
                onClick={() => setNewCatIsRest((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${
                  newCatIsRest
                    ? "bg-sky-900/60 border-sky-700/60 text-sky-400"
                    : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
                }`}
              >
                REST
              </button>

              <button
                type="button"
                disabled={!newCatName.trim() || addingCat}
                onClick={() => {
                  if (!newCatName.trim()) return;
                  setAddingCat(true);
                  addCategory(newCatName.trim(), newCatIsRest).finally(() => {
                    setNewCatName("");
                    setNewCatIsRest(false);
                    setAddingCat(false);
                  });
                }}
                className="px-4 py-2 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-40 text-white text-xs font-semibold transition-colors shrink-0"
              >
                {addingCat ? "Adding…" : "Add"}
              </button>
            </div>
          </section>

          {/* Colors */}
          <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-6">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider font-mono border-b border-gray-700 pb-3">
              Colors
            </h2>

            {/* Editable Brand Colors */}
            <div className="flex flex-col gap-4">
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Brand (Editable)</p>
              {(
                [
                  { key: "primary_color",      label: "Primary",      desc: "Main accent — buttons, active states, bars" },
                  { key: "primary_color_dark",  label: "Primary Dark", desc: "Hover / pressed state of primary" },
                ] as { key: "primary_color" | "primary_color_dark"; label: string; desc: string }[]
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-4">
                  {/* Color swatch / native picker */}
                  <label
                    className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer shrink-0 overflow-hidden"
                    style={{ backgroundColor: form[key] }}
                    title="Click to open color picker"
                  >
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(form[key]) ? form[key] : "#ED1C24"}
                      onChange={(e) => patch(key, e.target.value)}
                      className="opacity-0 w-0 h-0"
                    />
                  </label>
                  {/* Hex text input */}
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-white text-sm font-semibold">{label}</span>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => handleHexInput(key, e.target.value)}
                      maxLength={7}
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors font-mono w-36"
                      placeholder="#000000"
                    />
                    <p className="text-[10px] font-mono text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reference Palette */}
            {[
              {
                group: "Brand Identity",
                swatches: [
                  { label: "Mustang Red",      hex: "#ED1C24" },
                  { label: "Mustang Red Dark",  hex: "#C01920" },
                  { label: "Mustang Grey",      hex: "#A7A9AC" },
                  { label: "Dark Grey",         hex: "#58595B" },
                  { label: "Black",             hex: "#000000" },
                  { label: "White",             hex: "#FFFFFF" },
                ],
              },
              {
                group: "Team Calendar Palette",
                swatches: [
                  { label: "Team 1 – Red",     hex: "#ED1C24" },
                  { label: "Team 2 – Sky",      hex: "#38BDF8" },
                  { label: "Team 3 – Emerald",  hex: "#34D399" },
                  { label: "Team 4 – Amber",    hex: "#FBBF24" },
                  { label: "Team 5 – Purple",   hex: "#C084FC" },
                  { label: "Team 6 – Pink",     hex: "#F472B6" },
                  { label: "Team 7 – Orange",   hex: "#FB923C" },
                  { label: "Team 8 – Teal",     hex: "#2DD4BF" },
                ],
              },
              {
                group: "UI Surfaces",
                swatches: [
                  { label: "Background",        hex: "#000000" },
                  { label: "Surface 1",         hex: "#0D0D0D" },
                  { label: "Surface 2",         hex: "#1A1A1A" },
                  { label: "Surface 3 / Cards", hex: "#262626" },
                  { label: "Border",            hex: "#374151" },
                ],
              },
            ].map(({ group, swatches }) => (
              <div key={group} className="flex flex-col gap-3">
                <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">{group}</p>
                <div className="flex flex-wrap gap-3">
                  {swatches.map(({ label, hex }) => (
                    <div key={hex + label} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-9 h-9 rounded-lg border border-gray-600 shrink-0"
                        style={{ backgroundColor: hex }}
                        title={label}
                      />
                      <span className="text-[9px] font-mono text-gray-500 text-center leading-tight max-w-[52px]">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
