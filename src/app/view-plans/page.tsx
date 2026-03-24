"use client";

import DashboardLayout from "@/components/DashboardLayout";
import PastPlansCard from "@/components/PastPlansCard";
import { useTeam } from "@/context/TeamContext";

export default function ViewPlansPage() {
  const { activeTeam } = useTeam();

  const title    = activeTeam ? `${activeTeam.name} Plans` : "View Plans";
  const subtitle = activeTeam
    ? `${activeTeam.name.toUpperCase()} · SAVED PRACTICE PLANS`
    : "ALL SAVED PRACTICE PLANS";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-gray-400 text-xs font-mono mt-0.5">{subtitle}</p>
      </div>
      <PastPlansCard showViewButton />
    </DashboardLayout>
  );
}
