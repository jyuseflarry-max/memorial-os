"use client";

import { useActionState, useEffect, useState } from "react";
import { User, KeyRound, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import FamilyShell from "@/components/FamilyShell";
import { updateProfile, updatePassword } from "@/actions/account";
import { logout } from "@/actions/auth";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

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

export default function FamilyAccountPage() {
  const { authUser } = useAuth();
  const [email, setEmail] = useState("");

  const [profileState, profileAction, profilePending] = useActionState(updateProfile, null);
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const fullName  = authUser?.fullName ?? "";
  const firstName = fullName.split(" ")[0] || "Family";

  const inputCls = "bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors w-full";

  return (
    <FamilyShell>
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <span className="text-purple-400 text-lg font-bold">{firstName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{fullName || "My Account"}</h1>
            {email && <p className="text-gray-500 text-xs font-mono mt-0.5">{email}</p>}
          </div>
        </div>

        {/* Profile */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-purple-400" />
            <h2 className="text-white font-semibold text-sm">Profile</h2>
          </div>
          <form action={profileAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Full Name</label>
              <input
                name="full_name"
                type="text"
                required
                defaultValue={fullName}
                key={fullName}
                className={inputCls}
                placeholder="Your full name"
              />
            </div>
            <Feedback state={profileState} />
            <button type="submit" disabled={profilePending}
              className="self-start px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {profilePending ? "Saving…" : "Save name"}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-purple-400" />
            <h2 className="text-white font-semibold text-sm">Change Password</h2>
          </div>
          <form action={passwordAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">New Password</label>
              <input name="password" type="password" required minLength={8} autoComplete="new-password"
                className={inputCls} placeholder="Min. 8 characters" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Confirm Password</label>
              <input name="confirm" type="password" required minLength={8} autoComplete="new-password"
                className={inputCls} placeholder="Re-enter password" />
            </div>
            <Feedback state={passwordState} />
            <button type="submit" disabled={passwordPending}
              className="self-start px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {passwordPending ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-800 text-gray-500 hover:text-red-400 hover:border-red-900/50 text-sm font-medium transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </form>
      </div>
    </FamilyShell>
  );
}
