"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { User, KeyRound, CheckCircle2, AlertCircle, PartyPopper, Link2, Share2, LogOut } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { updateProfile, updatePassword } from "@/actions/account";
import { logout } from "@/actions/auth";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

// ── Types ──────────────────────────────────────────────────────────────────

interface AccountInfo {
  email: string;
  fullName: string;
  role: string;
}

// ── Feedback banner ────────────────────────────────────────────────────────

function Feedback({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error && !state?.success) return null;
  return state.error ? (
    <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
      <AlertCircle size={15} className="shrink-0" /> {state.error}
    </div>
  ) : (
    <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
      <CheckCircle2 size={15} className="shrink-0" /> {state.success}
    </div>
  );
}

// ── Family link copy card (players only) ───────────────────────────────────

function FamilyLinkCard({ playerId }: { playerId: string }) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/join/family?playerID=${playerId}`;
    if (navigator.share) {
      navigator.share({
        title: "Join my team on The Coach's OS",
        text: "Tap this link to create a free family account and follow my schedule.",
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Share2 size={16} className="text-purple-400" />
        <h2 className="text-white font-semibold text-sm">Share with Family</h2>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">
        Send this link to a parent or guardian. They&apos;ll create a free account and be able to see your schedule, game times, and departure info.
      </p>
      <button
        type="button"
        onClick={handleShare}
        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border font-semibold text-sm transition-colors ${
          copied
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
        }`}
      >
        {copied ? <CheckCircle2 size={15} /> : <Share2 size={15} />}
        {copied ? "Link copied!" : "Add a Family Member"}
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function AccountPageInner() {
  const searchParams  = useSearchParams();
  const isWelcome     = searchParams.get("welcome") === "1";
  const { authUser }  = useAuth();

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [profileState, profileAction, profilePending] = useActionState(updateProfile, null);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      setAccount({
        email:    user.email ?? "",
        fullName: data?.full_name ?? "",
        role:     data?.role ?? "Coach",
      });
    }
    load();
  }, [profileState?.success]);

  const isPlayer = authUser?.role === "Player";
  const playerId = authUser?.playerId;

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        {/* Welcome banner for newly invited users */}
        {isWelcome && (
          <div className="flex flex-col items-center gap-4 bg-coaches-blue/10 border border-coaches-blue/20 rounded-2xl px-5 py-5">
            <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={160} height={64} className="h-10 w-auto object-contain rounded" />
            <div className="flex items-start gap-3">
              <PartyPopper size={20} className="text-coaches-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Welcome to the program.</p>
                <p className="text-gray-400 text-xs mt-0.5">Set your name below so your coaches know it&apos;s you, then head into the app.</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-bold">My Account</h1>
          <p className="text-gray-400 text-sm mt-1">
            {account ? (
              <span>
                <span className="text-white font-medium">{account.email}</span>
                <span className="ml-2 text-[10px] font-mono uppercase tracking-wider bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                  {account.role}
                </span>
              </span>
            ) : (
              "Loading…"
            )}
          </p>
        </div>

        {/* Profile */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-coaches-blue" />
            <h2 className="text-white font-semibold text-sm">Profile</h2>
          </div>

          <form action={profileAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Full Name</label>
              <input
                name="full_name"
                type="text"
                required
                defaultValue={account?.fullName ?? ""}
                key={account?.fullName}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-blue transition-colors"
                placeholder="Your full name"
              />
            </div>
            <Feedback state={profileState} />
            <button type="submit" disabled={profilePending} className="self-start px-5 py-2.5 rounded-xl bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {profilePending ? "Saving…" : "Save name"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-coaches-blue" />
            <h2 className="text-white font-semibold text-sm">Change Password</h2>
          </div>

          <form action={passwordAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">New Password</label>
              <input name="password" type="password" required minLength={8} autoComplete="new-password"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-blue transition-colors"
                placeholder="Min. 8 characters" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Confirm Password</label>
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-coaches-blue transition-colors"
                placeholder="Re-enter password" />
            </div>
            <Feedback state={passwordState} />
            <button type="submit" disabled={passwordPending} className="self-start px-5 py-2.5 rounded-xl bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {passwordPending ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        {/* Family link — players only */}
        {isPlayer && playerId && <FamilyLinkCard playerId={playerId} />}

        {/* Sign out — accessible from Me tab without needing the top bar */}
        {isPlayer && (
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-800 text-gray-500 hover:text-red-400 hover:border-red-900/50 text-sm font-medium transition-colors"
            >
              <LogOut size={15} /> Sign out
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  );
}
