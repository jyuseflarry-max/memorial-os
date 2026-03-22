"use client";

import { Session, SessionDrill, parseTime, formatTime12, totalDuration, totalShots } from "@/types/session";
import { DrillCategory } from "@/types/drill";
import { Player } from "@/types/player";

// ── Category colours ──────────────────────────────────────────────────────

const CAT_COLOR: Record<DrillCategory, string> = {
  [DrillCategory.Defense]:        "text-blue-400   print:text-blue-700",
  [DrillCategory.Offense]:        "text-green-400  print:text-green-700",
  [DrillCategory.Transition]:     "text-yellow-400 print:text-yellow-700",
  [DrillCategory.SpecialTeams]:   "text-purple-400 print:text-purple-700",
  [DrillCategory.RestTransition]: "text-sky-400    print:text-sky-700",
};

// ── Row builder ───────────────────────────────────────────────────────────

interface ScriptRow extends SessionDrill {
  startStr: string;
  endStr: string;
}

function buildRows(session: Session): ScriptRow[] {
  let cursor = parseTime(session.startTime);
  return session.drills.map((sd) => {
    const startStr = formatTime12(cursor);
    cursor += sd.duration;
    const endStr = formatTime12(cursor);
    return { ...sd, startStr, endStr };
  });
}

// ── Small helpers ─────────────────────────────────────────────────────────

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div className="border-b border-gray-400" style={{ height: "22px" }} />
      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function NotesLines({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-gray-300" style={{ height: "18px" }} />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

interface Props { session: Session; players?: Player[] }

export default function CoachScript({ session, players = [] }: Props) {
  if (session.drills.length === 0) return null;

  const rows      = buildRows(session);
  const mins      = totalDuration(session.drills);
  const shots     = Math.round(totalShots(session.drills));
  const startLabel = formatTime12(parseTime(session.startTime));

  const dateLabel = new Date(session.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  // intensity breakdown for summary bar
  const avgIntensity = session.drills.length
    ? (session.drills.reduce((s, d) => s + d.drill.intensity, 0) / session.drills.length).toFixed(1)
    : "—";

  return (
    <section
      id="coach-script"
      className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden
                 print:border-0 print:rounded-none print:bg-white print:mt-0 print:shadow-none"
    >
      {/* ── Screen-only label ──────────────────────────────────────────── */}
      <div className="flex items-center px-6 py-4 border-b border-gray-700 print:hidden">
        <div>
          <p className="text-white font-bold text-base">Coach&apos;s Script</p>
          <p className="text-gray-400 text-xs font-mono">
            {dateLabel} · Start {startLabel} · {mins} min · ~{shots} shots
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          PRINT-ONLY DOCUMENT — everything below is hidden on screen
      ════════════════════════════════════════════════════════════════ */}

      {/* ── Red accent bar ─────────────────────────────────────────────── */}
      <div
        className="hidden print:block w-full mb-0"
        style={{ backgroundColor: "#ED1C24", height: "10px" }}
      />

      {/* ── Main header ────────────────────────────────────────────────── */}
      <div className="hidden print:flex items-center justify-between px-0 pt-4 pb-3 border-b-2 border-black">
        {/* Left: logo + identity */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mustang-logo.png" alt="Memorial Mustangs" width={60} height={60} />
          <div>
            <p className="font-black text-black text-xl leading-tight tracking-tight">
              MEMORIAL HIGH SCHOOL
            </p>
            <p className="text-gray-600 text-xs font-mono uppercase tracking-widest">
              Mustangs Basketball · 2025–26 Season
            </p>
          </div>
        </div>

        {/* Right: document type + date */}
        <div className="text-right">
          <p className="font-black text-3xl tracking-tight leading-none" style={{ color: "#ED1C24" }}>
            PRACTICE PLAN
          </p>
          <p className="text-black font-bold text-sm mt-1">{dateLabel}</p>
          <p className="text-gray-500 text-[11px] font-mono mt-0.5">
            Start {startLabel} · {mins} min · ~{shots} shots · Avg intensity {avgIntensity}/5
          </p>
        </div>
      </div>

      {/* ── Session focus bar ──────────────────────────────────────────── */}
      <div className="hidden print:grid grid-cols-3 gap-4 py-3 border-b border-gray-300 text-xs">
        {[
          { label: "Session Focus", hint: "(e.g. Half-Court Offense)" },
          { label: "Emphasis",      hint: "(e.g. Ball Movement)"       },
          { label: "Practice Phase",hint: "(e.g. Pre-Season Block 3)"  },
        ].map(({ label, hint }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wide">
              {label} <span className="normal-case text-gray-400">{hint}</span>
            </span>
            <div className="border-b border-gray-400" style={{ height: "18px" }} />
          </div>
        ))}
      </div>

      {/* ── Drill table ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700 print:border-gray-400 print:bg-gray-100">
              {[
                { label: "Time Block", w: "w-[130px]" },
                { label: "Drill",      w: ""           },
                { label: "Category",   w: "w-[105px]"  },
                { label: "Density",    w: "w-[75px]"   },
                { label: "Proj. Reps", w: "w-[80px]"   },
              ].map(({ label, w }) => (
                <th
                  key={label}
                  className={`${w} px-4 py-2 text-left text-[10px] font-mono uppercase tracking-wider
                              text-gray-500 print:text-gray-700 print:border-b print:border-gray-400`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              const projReps = Math.round(row.drill.shot_density * row.duration);
              const isRest   = row.drill.category === DrillCategory.RestTransition;
              return (
                <tr
                  key={row.instanceId}
                  className={`border-b border-gray-700/50 last:border-0 print:border-gray-200
                              ${i % 2 === 0 ? "print:bg-white" : "print:bg-gray-50"}
                              hover:bg-gray-700/20 print:hover:bg-transparent`}
                >
                  {/* Time block */}
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    <span className="text-white print:text-black font-semibold">{row.startStr}</span>
                    <span className="text-gray-500 mx-1 print:text-gray-400">–</span>
                    <span className="text-white print:text-black font-semibold">{row.endStr}</span>
                    <span className="block text-gray-500 print:text-gray-400 text-[10px]">
                      {row.duration} min
                    </span>
                  </td>

                  {/* Drill name */}
                  <td className="px-4 py-3">
                    <p className="text-white print:text-black font-semibold">{row.drill.name}</p>
                    {row.drill.sub_category && (
                      <p className="text-gray-500 text-[10px] font-mono">{row.drill.sub_category}</p>
                    )}
                    {/* Player groups — print only */}
                    {row.groups && row.groups.length > 0 && (
                      <div className="hidden print:block mt-1.5 pt-1.5 border-t border-gray-200 space-y-0.5">
                        {row.groups.map((g, gi) => {
                          const names = g.playerIds
                            .map((id) => {
                              const p = players.find((pl) => pl.id === id);
                              return p ? p.name.split(" ").slice(-1)[0] : null;
                            })
                            .filter(Boolean)
                            .join(", ");
                          return (
                            <p key={gi} className="text-[9px] font-mono text-gray-700 leading-tight">
                              <span className="font-bold">{g.name}:</span>{" "}
                              {names || <em className="font-normal text-gray-400">No players assigned</em>}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className={`px-4 py-3 text-xs font-semibold font-mono ${CAT_COLOR[row.drill.category]}`}>
                    {row.drill.category}
                    {row.drill.sub_category && (
                      <span className="font-normal text-gray-500 print:text-gray-500"> ({row.drill.sub_category})</span>
                    )}
                  </td>

                  {/* Density */}
                  <td className="px-4 py-3 text-gray-300 print:text-black font-mono text-xs">
                    {isRest ? <span className="text-gray-500">—</span> : `${row.drill.shot_density}/min`}
                  </td>

                  {/* Proj. reps */}
                  <td className="px-4 py-3 font-mono text-xs">
                    {isRest
                      ? <span className="text-gray-500">—</span>
                      : <span className="text-white print:text-black font-bold">~{projReps}</span>}
                  </td>

                </tr>
              );
            })}
          </tbody>

          {/* Totals */}
          <tfoot>
            <tr className="border-t-2 border-gray-600 print:border-black">
              <td colSpan={2} className="px-4 py-2 text-gray-500 print:text-gray-700 text-xs font-mono font-bold">
                SESSION TOTALS
              </td>
              <td />
              <td className="px-4 py-2 font-bold font-mono text-xs text-mustang-red print:text-black">
                ~{shots} shots
              </td>
              <td className="px-4 py-2 font-bold font-mono text-xs text-mustang-red print:text-black">
                {mins} min
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Post-practice notes ────────────────────────────────────────── */}
      <div className="hidden print:block pt-4 pb-3 border-t border-gray-300 mt-2">
        <p className="text-[10px] font-mono font-bold text-gray-700 uppercase tracking-widest mb-2">
          Post-Practice Notes
        </p>
        <NotesLines count={4} />
      </div>

      {/* ── Signature lines ────────────────────────────────────────────── */}
      <div className="hidden print:flex items-end gap-6 pt-2 pb-4 border-t border-gray-300">
        <SignatureLine label="Head Coach" />
        <SignatureLine label="Assistant Coach" />
        <SignatureLine label="Assistant Coach" />
        <SignatureLine label="Athletic Trainer" />
      </div>

      {/* ── Footer bar ─────────────────────────────────────────────────── */}
      <div
        className="hidden print:flex items-center justify-between px-3 py-1.5 text-white text-[9px] font-mono"
        style={{ backgroundColor: "#ED1C24" }}
      >
        <span>MEMORIAL MUSTANGS BASKETBALL · STAFF CONFIDENTIAL</span>
        <span>Generated {generatedOn} · Memorial Basketball OS</span>
      </div>
    </section>
  );
}
