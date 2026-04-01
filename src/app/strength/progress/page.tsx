"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import LiftProgressChart from "@/components/LiftProgressChart";
import { useAuth } from "@/context/AuthContext";
import type { StrengthExercise } from "@/types/strength";

export default function StrengthProgressPage() {
  const router          = useRouter();
  const { authUser }    = useAuth();
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedEx, setSelectedEx] = useState<string>("");

  const playerId = authUser?.id ?? "";

  useEffect(() => {
    fetch("/api/strength/exercises")
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (!Array.isArray(d)) return;
        const primaries = (d as StrengthExercise[])
          .filter(e => e.is_primary_lift)
          .sort((a, b) => a.name.localeCompare(b.name));
        setExercises(primaries);
        if (primaries[0]) setSelectedEx(primaries[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedExercise = exercises.find(e => e.id === selectedEx);

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <ChevronLeft size={15} />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">My Strength Progress</h1>
            <p className="text-gray-500 text-xs font-mono">Estimated 1-rep maxes over time</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-coaches-red" />
          </div>
        ) : exercises.length === 0 ? (
          <p className="text-gray-600 font-mono text-sm text-center py-16">
            No primary lifts are set up yet.
          </p>
        ) : (
          <>
            {/* Exercise pill tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedEx(ex.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                    selectedEx === ex.id
                      ? "bg-coaches-red border-coaches-red text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>

            {/* Chart */}
            {playerId && selectedEx && (
              <LiftProgressChart
                playerId={playerId}
                exerciseId={selectedEx}
                exerciseName={selectedExercise?.name}
                color="var(--color-coaches-red)"
              />
            )}

            {!playerId && (
              <p className="text-gray-600 text-sm font-mono text-center py-8">
                Sign in to see your progress.
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
