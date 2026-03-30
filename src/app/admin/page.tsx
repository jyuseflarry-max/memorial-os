"use client";

import Link from "next/link";
import {
  UserCog, Users, UsersRound, MapPin,
  Target, TrendingUp, Tag,
  Dumbbell, Lock, Package, BookOpen,
  Settings, ChevronRight, ShieldCheck,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ── Table registry ─────────────────────────────────────────────────────────

const SECTIONS = [
  {
    label: "People",
    description: "Manage everyone in your program.",
    tables: [
      {
        href:  "/admin/roster",
        icon:  UserCog,
        title: "Roster",
        desc:  "Add, edit, and remove players. Set jersey numbers, class year, and family links.",
      },
      {
        href:  "/admin/teams",
        icon:  Users,
        title: "Teams",
        desc:  "Create and rename sub-groups. Players are assigned to a team for filtering across the app.",
      },
      {
        href:  "/admin/users",
        icon:  UsersRound,
        title: "Users",
        desc:  "Invite coaches, managers, and admins. Reset passwords and manage roles.",
      },
      {
        href:  "/admin/locations",
        icon:  MapPin,
        title: "Locations",
        desc:  "Practice venues and travel sites. Used when scheduling and printing plans.",
      },
    ],
  },
  {
    label: "Practice Catalog",
    description: "Reference data that tags and classifies every drill.",
    tables: [
      {
        href:  "/admin/drill-objectives",
        icon:  Target,
        title: "Drill Objectives",
        desc:  "Skill outcomes that drills can target — e.g. Footwork, Finishing, IQ/Read.",
      },
      {
        href:  "/admin/stat-impacts",
        icon:  TrendingUp,
        title: "Stat Impacts",
        desc:  "Game-stat categories that drills reinforce — e.g. Effective FG%, Rebounding %.",
      },
      {
        href:  "/admin/drill-categories",
        icon:  Tag,
        title: "Drill Categories",
        desc:  "Color-coded labels used across the Planner, Vault, and Analytics. Each gets a unique color and an optional REST flag.",
      },
    ],
  },
  {
    label: "Strength & Conditioning",
    description: "Biometrics, exercise library, and facility setup.",
    tables: [
      {
        href:  "/admin/strength/biometrics",
        icon:  Lock,
        title: "Player Biometrics",
        desc:  "Coach-only. DOB, biological sex, and body weight (AES-256-GCM encrypted at rest).",
      },
      {
        href:  "/admin/strength/exercises",
        icon:  BookOpen,
        title: "Exercise Library",
        desc:  "90+ global exercises plus custom additions. Muscle groups, video demos, coaching cues.",
      },
      {
        href:  "/admin/strength/inventory",
        icon:  Package,
        title: "Facility Inventory",
        desc:  "Toggle available equipment — bars, plates, machines, and accessories.",
      },
    ],
  },
  {
    label: "Program",
    description: "Global configuration for your program.",
    tables: [
      {
        href:  "/settings",
        icon:  Settings,
        title: "Program Settings",
        desc:  "Name, logo, season, brand colors, module visibility, and integrations.",
        external: true,
      },
    ],
  },
];

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminHubPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">ALL MANAGED TABLES</p>
          </div>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              {/* Section header */}
              <div className="mb-3">
                <h2 className="text-white font-semibold text-sm">{section.label}</h2>
                <p className="text-gray-500 text-xs font-mono mt-0.5">{section.description}</p>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.tables.map((table) => (
                  <Link
                    key={table.href}
                    href={table.href}
                    className="group flex items-start gap-4 bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-700/60 rounded-2xl p-5 transition-all"
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-gray-700 group-hover:bg-gray-600 border border-gray-600 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                      <table.icon size={16} className="text-gray-300" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white font-semibold text-sm">{table.title}</p>
                        <ChevronRight
                          size={14}
                          className="text-gray-600 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all shrink-0"
                        />
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">{table.desc}</p>
                      {"external" in table && table.external && (
                        <span className="inline-block mt-1.5 text-[9px] font-mono uppercase tracking-wider text-gray-600 bg-gray-700 border border-gray-600 px-1.5 py-0.5 rounded">
                          In Settings
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
