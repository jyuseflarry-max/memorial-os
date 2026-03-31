"use client";

import { useState, useRef } from "react";
import { X, Download, Upload, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";

type ImportType = "roster" | "games" | "practices" | "strength";

interface ImportResult {
  success: number;
  errors: string[];
}

const CSV_TEMPLATES: Record<ImportType, { headers: string[]; example: string[]; filename: string }> = {
  roster: {
    headers: ["name", "jersey_number", "position", "class_year", "status", "email"],
    example: ["John Smith", "10", "Guard", "Senior", "Active", "jsmith@email.com"],
    filename: "roster_template.csv",
  },
  games: {
    headers: ["game_date", "game_time", "opponent", "location_type", "game_type", "venue", "game_note"],
    example: ["2025-11-15", "19:00", "Klein HS", "away", "non-district", "Klein Memorial Gym, 10500 Stuebner Airline Rd, Spring TX 77379", ""],
    filename: "games_template.csv",
  },
  practices: {
    headers: ["practice_date", "start_time", "end_time", "location_name", "notes"],
    example: ["2025-11-18", "15:30", "17:30", "Memorial HS Gym", "Film review first 20 min"],
    filename: "practices_template.csv",
  },
  strength: {
    headers: ["schedule_date", "start_time", "end_time", "program_name", "notes"],
    example: ["2025-11-18", "07:00", "08:00", "Pre-Season Block 1", ""],
    filename: "strength_schedule_template.csv",
  },
};

function downloadTemplate(type: ImportType) {
  const t = CSV_TEMPLATES[type];
  const rows = [t.headers.join(","), t.example.join(",")];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = t.filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

interface Props {
  teamId: string | null;
  onClose: () => void;
  onImported?: () => void;
}

export default function BulkImportModal({ teamId, onClose, onImported }: Props) {
  const [activeTab, setActiveTab]   = useState<ImportType>("roster");
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      setResult({ success: 0, errors: ["No data rows found. Make sure the file has a header row and at least one data row."] });
      return;
    }

    setImporting(true);
    setResult(null);

    let success = 0;
    const errors: string[] = [];

    if (activeTab === "roster") {
      for (const row of rows) {
        if (!row.name?.trim()) { errors.push(`Row missing name: ${JSON.stringify(row)}`); continue; }
        const payload = {
          name:          row.name.trim(),
          jersey_number: parseInt(row.jersey_number) || 0,
          position:      row.position || "",
          class_year:    row.class_year || "",
          status:        row.status || "Active",
          email:         row.email || null,
          team_id:       teamId,
          titan_load:    100,
        };
        const res = await fetch("/api/players", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) success++; else { const d = await res.json(); errors.push(`${row.name}: ${d.error ?? "Failed"}`); }
      }
    } else if (activeTab === "games") {
      for (const row of rows) {
        if (!row.game_date?.trim() || !row.opponent?.trim()) { errors.push(`Row missing date or opponent: ${JSON.stringify(row)}`); continue; }
        const payload = {
          team_id:       teamId,
          season:        row.game_date.substring(0, 4) + "-" + String(parseInt(row.game_date.substring(0, 4)) + 1),
          game_date:     row.game_date.trim(),
          game_time:     row.game_time?.trim() || null,
          time_tbd:      !row.game_time?.trim(),
          opponent:      row.opponent.trim(),
          location_type: (row.location_type?.trim() || "home") as "home" | "away" | "neutral",
          game_type:     (row.game_type?.trim() || "non-district") as string,
          venue:         row.venue?.trim() || null,
          game_note:     row.game_note?.trim() || null,
          score_us:      null,
          score_them:    null,
          highlights_url: null,
          box_score_url:  null,
          game_writeup:   null,
        };
        const res = await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) success++; else { const d = await res.json(); errors.push(`${row.opponent} (${row.game_date}): ${d.error ?? "Failed"}`); }
      }
    } else if (activeTab === "practices") {
      for (const row of rows) {
        if (!row.practice_date?.trim()) { errors.push(`Row missing date: ${JSON.stringify(row)}`); continue; }
        const payload = {
          practice_date: row.practice_date.trim(),
          start_time:    row.start_time?.trim() || "15:30",
          end_time:      row.end_time?.trim() || "17:30",
          team_id:       teamId,
          notes:         row.notes?.trim() || null,
        };
        const res = await fetch("/api/practice-schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) success++; else { const d = await res.json(); errors.push(`${row.practice_date}: ${d.error ?? "Failed"}`); }
      }
    } else if (activeTab === "strength") {
      // Fetch programs for name→id mapping
      const progsRes = await fetch("/api/strength/programs");
      const progs: { id: string; name: string }[] = progsRes.ok ? await progsRes.json() : [];

      for (const row of rows) {
        if (!row.schedule_date?.trim()) { errors.push(`Row missing date: ${JSON.stringify(row)}`); continue; }
        const progName = row.program_name?.trim();
        const progId   = progName ? (progs.find((p) => p.name.toLowerCase() === progName.toLowerCase())?.id ?? null) : null;
        const payload = {
          schedule_date: row.schedule_date.trim(),
          start_time:    row.start_time?.trim() || "07:00",
          end_time:      row.end_time?.trim() || "08:00",
          program_id:    progId,
          team_id:       teamId,
          notes:         row.notes?.trim() || null,
        };
        const res = await fetch("/api/strength-schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) success++; else { const d = await res.json(); errors.push(`${row.schedule_date}: ${d.error ?? "Failed"}`); }
      }
    }

    setImporting(false);
    setResult({ success, errors });
    if (success > 0) onImported?.();
    if (fileRef.current) fileRef.current.value = "";
  }

  const tabs: { key: ImportType; label: string }[] = [
    { key: "roster",    label: "Roster"    },
    { key: "games",     label: "Games"     },
    { key: "practices", label: "Practices" },
    { key: "strength",  label: "Strength"  },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold text-base">Bulk Import</h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">Download a template, fill it in, then upload.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setActiveTab(key); setResult(null); }}
              className={`flex-1 px-4 py-3 text-xs font-semibold font-mono transition-colors ${
                activeTab === key ? "text-coaches-red border-b-2 border-coaches-red" : "text-gray-500 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Template download */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
            <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Step 1 — Download Template</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {activeTab === "strength"
                  ? "program_name is matched by exact name (case-insensitive) to your Strength Programs."
                  : activeTab === "games"
                  ? "location_type must be: home, away, or neutral. game_type: non-district, district, scrimmage, tournament, playoffs."
                  : activeTab === "practices"
                  ? "Imports date, time, and notes. Assign a facility after importing."
                  : "status must be: Active, Out, or Restricted."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadTemplate(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors shrink-0"
            >
              <Download size={13} /> CSV
            </button>
          </div>

          {/* Upload */}
          <div>
            <p className="text-white text-sm font-semibold mb-2">Step 2 — Upload Filled CSV</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-600 hover:border-coaches-red/50 text-gray-400 hover:text-coaches-red text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? "Importing…" : "Choose CSV file"}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {/* Result */}
          {result && (
            <div className="flex flex-col gap-2">
              {result.success > 0 && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 size={15} /> {result.success} record{result.success !== 1 ? "s" : ""} imported successfully.
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mb-1.5">
                    <AlertCircle size={12} /> {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {result.errors.slice(0, 8).map((e, i) => (
                      <li key={i} className="text-red-400/80 text-[11px] font-mono">{e}</li>
                    ))}
                    {result.errors.length > 8 && (
                      <li className="text-red-500/60 text-[11px] font-mono">…and {result.errors.length - 8} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
