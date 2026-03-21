"use client";

import Image from "next/image";
import { Printer } from "lucide-react";
import { Session, SessionDrill, parseTime, formatTime12, totalDuration, totalShots } from "@/types/session";
import { DrillCategory } from "@/types/drill";

// ── Category colours (screen) ─────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  session: Session;
}

export default function CoachScript({ session }: Props) {
  if (session.drills.length === 0) return null;

  const rows   = buildRows(session);
  const mins   = totalDuration(session.drills);
  const shots  = Math.round(totalShots(session.drills));

  const dateLabel = new Date(session.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const startLabel = formatTime12(parseTime(session.startTime));

  return (
    <section
      id="coach-script"
      className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden
                 print:border-0 print:rounded-none print:bg-white print:mt-0 print:shadow-none"
    >
      {/* ── Screen header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 print:hidden">
        <div>
          <p className="text-white font-bold text-base">Coach&apos;s Script</p>
          <p className="text-gray-400 text-xs font-mono">
            {dateLabel} · Start {startLabel} · {mins} min · ~{shots} shots
          </p>
        </div>
      </div>

      {/* ── Print-only branded header ────────────────────────────────── */}
      <div className="hidden print:flex items-start justify-between pb-4 mb-4 border-b-2 border-gray-300">
        {/* Left: logo + school name */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mustang-logo.png" alt="Memorial Mustangs" width={52} height={52} />
          <div>
            <p className="font-bold text-black text-lg leading-tight">Memorial High School</p>
            <p className="text-gray-500 text-xs tracking-wide">Mustangs Basketball</p>
          </div>
        </div>

        {/* Right: title + date */}
        <div className="text-right">
          <p className="text-2xl font-black tracking-tight" style={{ color: "#ED1C24" }}>
            PRACTICE PLAN
          </p>
          <p className="text-black font-semibold text-sm mt-0.5">{dateLabel}</p>
          <p className="text-gray-500 text-xs font-mono">
            Start {startLabel} · {mins} min total · ~{shots} projected shots
          </p>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto px-0 print:px-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700 print:border-gray-400">
              {[
                { label: "Time Block",    w: "w-[130px]" },
                { label: "Drill / Notes", w: "" },
                { label: "Category",      w: "w-[110px]" },
                { label: "Density",       w: "w-[80px]"  },
                { label: "Proj. Reps",    w: "w-[90px]"  },
                { label: "Coach Notes",   w: "w-[160px] print:w-[200px]" },
              ].map(({ label, w }) => (
                <th
                  key={label}
                  className={`${w} px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider
                              text-gray-500 print:text-gray-600 print:border-b print:border-gray-400`}
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
                              ${i % 2 === 0 ? "print:bg-gray-50" : "print:bg-white"}
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

                  {/* Drill name + sub-category */}
                  <td className="px-4 py-3">
                    <p className="text-white print:text-black font-semibold">{row.drill.name}</p>
                    {row.drill.sub_category && (
                      <p className="text-gray-500 print:text-gray-500 text-[10px] font-mono">
                        {row.drill.sub_category}
                      </p>
                    )}
                  </td>

                  {/* Category */}
                  <td className={`px-4 py-3 text-xs font-semibold font-mono ${CAT_COLOR[row.drill.category]}`}>
                    {row.drill.category}
                  </td>

                  {/* Shot density */}
                  <td className="px-4 py-3 text-gray-300 print:text-black font-mono text-xs">
                    {isRest ? <span className="text-gray-500">—</span> : `${row.drill.shot_density}/min`}
                  </td>

                  {/* Projected reps */}
                  <td className="px-4 py-3 font-mono text-xs">
                    {isRest ? (
                      <span className="text-gray-500">—</span>
                    ) : (
                      <span className="text-white print:text-black font-bold">~{projReps}</span>
                    )}
                  </td>

                  {/* Notes box */}
                  <td className="px-4 py-3">
                    <div
                      className="hidden print:block rounded border border-gray-400"
                      style={{ height: "42px" }}
                    />
                    <div className="print:hidden h-8 rounded border border-gray-600 bg-gray-900/40" />
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="border-t-2 border-gray-600 print:border-gray-400">
              <td colSpan={2} className="px-4 py-2.5 text-gray-500 print:text-gray-600 text-xs font-mono">
                TOTALS
              </td>
              <td />
              <td />
              <td className="px-4 py-2.5 font-bold font-mono text-xs text-mustang-red print:text-black">
                ~{shots} shots
              </td>
              <td className="px-4 py-2.5 font-bold font-mono text-xs text-mustang-red print:text-black">
                {mins} min
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Print footer ─────────────────────────────────────────────── */}
      <div className="hidden print:flex items-center justify-between mt-4 pt-3 border-t border-gray-300 text-[9px] font-mono text-gray-400">
        <span>Memorial Basketball OS · Confidential — Staff Use Only</span>
        <span>Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
    </section>
  );
}
