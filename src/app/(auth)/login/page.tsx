"use client";

import Image from "next/image";
import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/actions/auth";
import { ChevronRight, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  invite_expired: "That invite link has expired. Ask your coach to resend it.",
  missing_code:   "Invalid link. Please use the link from your invite email.",
};

function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");

  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 flex flex-col gap-5 backdrop-blur-sm">
      <div>
        <h1 className="text-white text-2xl font-bold">Sign in</h1>
        <p className="text-gray-400 text-sm mt-1">
          Access your program dashboard.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
            placeholder="coach@school.edu"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors"
            placeholder="••••••••"
          />
        </div>

        {(state?.error || urlError) && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="shrink-0" />
            {urlError ? (ERROR_MESSAGES[urlError] ?? "Something went wrong.") : state?.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-2xl bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white font-semibold text-base transition-colors mt-1"
        >
          {pending ? "Signing in…" : "Sign in"} <ChevronRight size={18} />
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-coaches-navy flex flex-col items-center justify-center px-5 py-10">
      {/* Splash logo */}
      <div className="mb-8 w-full max-w-sm">
        <Image
          src="/thecoachsOS.jpg"
          alt="The Coach's OS"
          width={480}
          height={192}
          className="w-full h-auto object-contain rounded-xl"
          priority
        />
      </div>

      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
