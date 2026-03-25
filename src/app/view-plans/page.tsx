"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
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
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-gray-400 text-xs font-mono mt-0.5">{subtitle}</p>
        </div>
        <Link
          href="/build-a-plan"
          className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg shrink-0"
        >
          <Plus size={16} />
          New Plan
        </Link>
      </div>
      <PastPlansCard showViewButton />
    </DashboardLayout>
  );
}
