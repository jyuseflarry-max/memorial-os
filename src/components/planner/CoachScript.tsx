"use client";

import { useState, Fragment } from "react";
import { Target } from "lucide-react";
import { Session, SessionDrill, parseTime, formatTime12, totalDuration, totalShots } from "@/types/session";
import { DrillCategory } from "@/types/drill";
import { Player } from "@/types/player";
import ShotCounterModal from "@/components/planner/ShotCounterModal";
import { useDrillCategories } from "@/context/DrillCategoryContext";
import { useSettings } from "@/context/SettingsContext";

// ── Row builder ───────────────────────────────────────────────────────────

interface ScriptRow extends SessionDrill {
  startStr: string;
  endStr: string;
  remaining: number;
}

function buildRows(session: Session): ScriptRow[] {
  let cursor = parseTime(session.startTime);
  const total = totalDuration(session.drills);
  let elapsed = 0;
  return session.drills.map((sd) => {
    const startStr = formatTime12(cursor);
    cursor  += sd.duration;
    elapsed += sd.duration;
    const endStr   = formatTime12(cursor);
    const remaining = total - elapsed;
    return { ...sd, startStr, endStr, remaining };
  });
}

// ── Name display ──────────────────────────────────────────────────────────

function lastNameOf(fullName: string): string {
  return fullName.trim().split(" ").slice(-1)[0];
}

function displayName(player: Player, allPlayers: Player[]): string {
  const last = lastNameOf(player.name);
  const hasDuplicate = allPlayers.some(
    (other) => other.id !== player.id && lastNameOf(other.name) === last
  );
  if (hasDuplicate) {
    const first = player.name.trim().split(" ")[0];
    return `${first[0]}. ${last}`;
  }
  return last;
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
  const { getCatColor } = useDrillCategories();
  const { settings } = useSettings();
  const [countingDrill, setCountingDrill] = useState<SessionDrill | null>(null);

  if (session.drills.length === 0) return null;

  const rows       = buildRows(session);
  const mins       = totalDuration(session.drills);
  const shots      = Math.round(totalShots(session.drills));
  const startLabel = formatTime12(parseTime(session.startTime));

  const dateLabel = new Date(session.date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const timeRangeLabel = `${startLabel} – ${formatTime12(parseTime(session.startTime) + mins)} (${mins} min)`;

  const avgIntensity = session.drills.length
    ? (session.drills.reduce((s, d) => s + d.drill.intensity, 0) / session.drills.length).toFixed(1)
    : "—";

  return (
    <>
      <section
        id="coach-script"
        className="mt-6 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden
                   print:border-0 print:rounded-none print:bg-white print:mt-0 print:shadow-none"
      >
        {/* ── Screen-only label ────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-700 print:hidden">
          <div>
            <p className="text-white font-bold text-base">{dateLabel}</p>
            <p className="text-gray-400 text-xs font-mono">{timeRangeLabel}</p>
            <p className="text-gray-400 text-xs font-mono">~{shots} shots per player</p>
          </div>
        </div>

        {/* ── Red accent bar ───────────────────────────────────────────── */}
        <div
          className="hidden print:block w-full mb-0"
          style={{ backgroundColor: "var(--color-coaches-red)", height: "6px" }}
        />

        {/* ── Main header ─────────────────────────────────────────────── */}
        <div className="hidden print:flex items-start justify-between px-0 pt-2 pb-2 border-b-2 border-black">
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logo_url || "/mustang-logo.png"} alt={settings.program_name} width={42} height={42} />
            <div>
              <p className="font-black text-black text-base leading-tight tracking-tight">
                {settings.program_name.toUpperCase()}
              </p>
              <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest">
                {settings.current_season} Season
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl tracking-tight leading-none" style={{ color: "var(--color-coaches-red)" }}>
              PRACTICE PLAN
            </p>
            <p className="text-black font-bold text-xs mt-0.5">{dateLabel}</p>
            <p className="text-gray-700 text-[10px] font-mono mt-0.5">{timeRangeLabel}</p>
            <p className="text-gray-700 text-[10px] font-mono">~{shots} shots per player</p>
          </div>
        </div>

        {/* ── Drill table ─────────────────────────────────────────────── */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-700 print:border-gray-400 print:bg-gray-100">
                {[
                  { label: "Time",           w: "w-[130px]",          cls: "" },
                  { label: "Remaining",      w: "w-[80px]",           cls: "hidden print:table-cell" },
                  { label: "Drill",          w: "",                   cls: "" },
                  { label: "",               w: "w-[48px]",           cls: "print:hidden" },
                ].map(({ label, w, cls }) => (
                  <th
                    key={label || "action"}
                    className={`${w} ${cls} px-4 py-2 print:py-1 print:px-3 text-left text-[10px] font-mono uppercase tracking-wider
                                text-gray-500 print:text-gray-700 print:border-b print:border-gray-400`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, i) => {
                const isRest   = row.drill.categories?.includes(DrillCategory.RestTransition);
                const hasGroups = row.groups && row.groups.length > 0;
                return (
                  <Fragment key={row.instanceId}>
                  <tr
                    className={`${hasGroups ? "" : "border-b border-gray-700/50 last:border-0"} print:border-gray-200 align-top
                                ${i % 2 === 0 ? "print:bg-white" : "print:bg-gray-50"}
                                hover:bg-gray-700/20 print:hover:bg-transparent`}
                  >
                    {/* Time block */}
                    <td className="px-4 py-3 print:py-1.5 print:px-3 font-mono text-xs whitespace-nowrap align-top">
                      <span className="text-white print:text-black font-semibold">{row.startStr}</span>
                      <span className="text-gray-500 mx-1 print:text-gray-400">–</span>
                      <span className="text-white print:text-black font-semibold">{row.endStr}</span>
                      <span className="block text-gray-500 print:text-gray-400 text-[10px]">
                        {row.duration} min
                      </span>
                    </td>

                    {/* Time remaining — print only */}
                    <td className="hidden print:table-cell px-3 py-1.5 align-top font-mono text-xs text-gray-700">
                      {row.remaining > 0 ? `${row.remaining} min` : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Drill name */}
                    <td className="px-4 py-3 print:py-1.5 print:px-3 align-top">
                      <p className="text-white print:text-black font-semibold print:text-xs">{row.drill.name}</p>
                      {(row.drill.objectives ?? []).length > 0 && (
                        <p className="text-gray-500 print:text-gray-500 text-[10px] font-mono mt-0.5">
                          {row.drill.objectives!.join(" · ")}
                        </p>
                      )}
                    </td>

                    {/* Shot counter button — screen only */}
                    <td className="px-2 py-3 print:py-1.5 print:hidden align-top">
                      {!isRest && (
                        <button
                          type="button"
                          onClick={() => setCountingDrill(row)}
                          title="Count shots for this drill"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-coaches-red/20 hover:border-coaches-red/40 border border-transparent transition-colors"
                        >
                          <Target size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {hasGroups && (
                    <tr className={`border-b border-gray-700/50 last:border-0 print:border-gray-200
                                    ${i % 2 === 0 ? "print:bg-white" : "print:bg-gray-50"}`}>
                      <td colSpan={4} className="px-4 pb-3 print:pb-2 print:px-3">
                        <div className="flex flex-col gap-2 print:gap-0.5">
                          {row.groups!.map((g, gi) => {
                            const playerNames = g.playerIds
                              .map((id) => {
                                const p = players.find((pl) => pl.id === id);
                                return p ? displayName(p, players) : null;
                              })
                              .filter(Boolean) as string[];
                            return (
                              <div key={gi}>
                                {/* Screen */}
                                <div className="print:hidden flex items-start gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wider shrink-0 pt-0.5">{g.name}:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {playerNames.length > 0
                                      ? playerNames.map((name) => (
                                          <span key={name} className="text-[10px] font-mono text-gray-300 bg-gray-700 border border-gray-600 px-1.5 py-0.5 rounded-md leading-none">
                                            {name}
                                          </span>
                                        ))
                                      : <span className="text-[10px] font-mono text-gray-600 italic">No players assigned</span>
                                    }
                                  </div>
                                </div>
                                {/* Print */}
                                <p className="hidden print:block text-[9px] font-mono text-gray-700 leading-tight">
                                  <span className="font-bold">{g.name}:</span>{" "}
                                  {playerNames.join(", ") || <em className="font-normal text-gray-400">No players assigned</em>}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>

          </table>
        </div>

        {/* ── Footer bar ──────────────────────────────────────────────── */}
        <div
          className="hidden print:flex items-center justify-between px-3 py-1.5 text-white text-[9px] font-mono"
          style={{ backgroundColor: "var(--color-coaches-red)" }}
        >
          <span>{settings.program_name.toUpperCase()} · STAFF CONFIDENTIAL</span>
          <span>Generated {generatedOn} · {settings.program_name}</span>
        </div>
      </section>

      {/* ── Shot Counter Modal ────────────────────────────────────────── */}
      {countingDrill && (
        <ShotCounterModal
          drill={countingDrill.drill}
          defaultPlayerCount={Math.max(players.length, 1)}
          onClose={() => setCountingDrill(null)}
          onSaved={() => setCountingDrill(null)}
        />
      )}
    </>
  );
}
