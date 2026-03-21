"use client";

import { Printer } from "lucide-react";
import { Session, SessionDrill, parseTime, formatTime12, totalDuration, totalShots } from "@/types/session";
import { DrillCategory } from "@/types/drill";

const INTENSITY_LABEL = ["", "Recovery", "Light", "Moderate", "Hard", "All-Out"];

const CAT_COLOR: Record<DrillCategory, string> = {
  [DrillCategory.Defense]:       "text-blue-400",
  [DrillCategory.Offense]:       "text-green-400",
  [DrillCategory.RestTransition]:"text-sky-400",
  [DrillCategory.Transition]:   "text-yellow-400",
  [DrillCategory.SpecialTeams]: "text-purple-400",
};

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

interface Props {
  session: Session;
}

export default function CoachScript({ session }: Props) {
  if (session.drills.length === 0) return null;

  const rows = buildRows(session);
  const mins = totalDuration(session.drills);
  const shots = Math.round(totalShots(session.drills));

  const dateLabel = new Date(session.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden print:border-0 print:rounded-none print:bg-white print:mt-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 print:border-gray-300">
        <div>
          <p className="text-white font-bold text-base print:text-black">
            Coach&apos;s Script
          </p>
          <p className="text-gray-400 text-xs font-mono print:text-gray-600">
            {dateLabel} · Start {formatTime12(parseTime(session.startTime))} · {mins} min · ~{shots} shots
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white text-sm font-medium transition-colors print:hidden"
        >
          <Printer size={15} />
          Print
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 print:border-gray-300">
              {["#", "Time Slot", "Drill", "Category", "Duration", "Intensity", "Shot Type", "Est. Shots"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider print:text-gray-600"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.instanceId}
                className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 print:border-gray-200 print:hover:bg-transparent"
              >
                <td className="px-4 py-3 text-gray-500 font-mono text-xs print:text-gray-400">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap print:text-black">
                  <span className="text-white print:text-black">{row.startStr}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="text-white print:text-black">{row.endStr}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white font-medium print:text-black">{row.drill.name}</p>
                  <p className="text-gray-500 text-[10px] font-mono print:text-gray-500">
                    {row.drill.sub_category}
                  </p>
                </td>
                <td className={`px-4 py-3 text-xs font-semibold font-mono ${CAT_COLOR[row.drill.category]}`}>
                  {row.drill.category}
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs print:text-black">
                  {row.duration} min
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs print:text-black">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <span
                          key={n}
                          className={`w-1.5 h-1.5 rounded-full ${n <= row.drill.intensity ? "bg-mustang-red" : "bg-gray-600 print:bg-gray-200"}`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-400 text-[10px] font-mono print:text-gray-500">
                      {INTENSITY_LABEL[row.drill.intensity]}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs print:text-black">
                  {row.drill.shot_type}
                </td>
                <td className="px-4 py-3 text-white font-bold font-mono text-xs print:text-black">
                  ~{Math.round(row.drill.shot_density * row.duration)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-700 print:border-gray-300">
              <td colSpan={4} />
              <td className="px-4 py-3 text-mustang-red font-bold font-mono text-xs print:text-black">
                {mins} min
              </td>
              <td />
              <td />
              <td className="px-4 py-3 text-mustang-red font-bold font-mono text-xs print:text-black">
                ~{shots}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
