"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PastPlansCard from "@/components/PastPlansCard";
import { useTeam } from "@/context/TeamContext";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

export default function ViewPlansPage() {
  const { activeTeam } = useTeam();
  const [isPlayer, setIsPlayer] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await sb.from("users").select("role").eq("id", user.id).single();
      if (data?.role === "Player") setIsPlayer(true);
    });
  }, []);

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
        {!isPlayer && (
          <Link
            href="/build-a-plan"
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg shrink-0"
          >
            <Plus size={16} />
            New Plan
          </Link>
        )}
      </div>
      <PastPlansCard showViewButton />
    </DashboardLayout>
  );
}
