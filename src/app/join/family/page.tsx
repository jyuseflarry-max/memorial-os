"use client";

import { useState, useEffect, useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { registerFamily } from "@/actions/family";
import { AlertCircle, ChevronRight, Check, Loader2 } from "lucide-react";

const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Other"] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

// ── Join content ────────────────────────────────────────────────────────────

function JoinContent() {
  const searchParams = useSearchParams();
  const playerID     = searchParams.get("playerID") ?? "";

  const [player,       setPlayer]       = useState<{ id: string; name: string } | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [sessionRole,  setSessionRole]  = useState<string | null | "loading">("loading");
  const [relationship, setRelationship] = useState<Relationship>("Parent");
  const [linkDone,     setLinkDone]     = useState(false);
  const [linkError,    setLinkError]    = useState<string | null>(null);
  const [linking,      setLinking]      = useState(false);

  const [formState, registerAction, pending] = useActionState(registerFamily, null);

  // Fetch player info
  useEffect(() => {
    if (!playerID) { setLoadingPlayer(false); return; }
    fetch(`/api/family/player-info?playerID=${playerID}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlayer(d?.id ? d : null))
      .catch(() => setPlayer(null))
      .finally(() => setLoadingPlayer(false));
  }, [playerID]);

  // Check current session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSessionRole(d?.role ?? null))
      .catch(() => setSessionRole(null));
  }, []);

  async function handleLink() {
    setLinking(true);
    setLinkError(null);
    const res  = await fetch("/api/family/link", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ player_id: playerID, relationship }),
    });
    const data = await res.json();
    if (!res.ok) { setLinkError(data.error ?? "Failed to link"); setLinking(false); return; }
    setLinkDone(true);
    setLinking(false);
  }

  const inputCls = "bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-blue transition-colors w-full";

  // ── Loading ──
  if (loadingPlayer || sessionRole === "loading") {
    return <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-blue" /></div>;
  }

  // ── Invalid link ──
  if (!playerID || !player) {
    return (
      <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 text-center">
        <p className="text-gray-400 font-mono text-sm">Invalid or expired link.</p>
        <p className="text-gray-600 text-xs mt-1">Contact your coach for a new join link.</p>
      </div>
    );
  }

  // ── Linked successfully ──
  if (linkDone) {
    return (
      <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Check size={22} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Linked!</h2>
          <p className="text-gray-400 text-sm mt-1">
            {player.name} has been added to your family dashboard.
          </p>
        </div>
        <a
          href="/family"
          className="px-6 py-2.5 rounded-xl bg-coaches-blue hover:bg-coaches-blue-dark text-white font-semibold text-sm transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  // ── Already logged in as Family → confirm link ──
  if (sessionRole === "Family") {
    return (
      <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 flex flex-col gap-5 backdrop-blur-sm">
        <div>
          <h1 className="text-white text-xl font-bold">Add Player</h1>
          <p className="text-gray-400 text-sm mt-1">
            Link <span className="text-white font-semibold">{player.name}</span> to your account.
          </p>
        </div>

        <div>
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Your relationship</p>
          <div className="flex gap-2 flex-wrap">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRelationship(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  relationship === r
                    ? "bg-coaches-blue border-coaches-blue text-white"
                    : "border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {linkError && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="shrink-0" /> {linkError}
          </div>
        )}

        <button
          type="button"
          onClick={handleLink}
          disabled={linking}
          className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-2xl bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white font-semibold text-base transition-colors"
        >
          {linking ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
          {linking ? "Linking…" : `Link to ${player.name}`}
        </button>
      </div>
    );
  }

  // ── Logged in as non-Family role ──
  if (sessionRole && sessionRole !== "Family") {
    return (
      <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 text-center">
        <p className="text-gray-300 text-sm font-semibold">You&apos;re signed in as a staff account.</p>
        <p className="text-gray-500 text-xs mt-1">Sign in with a Family account to link a player, or create one below.</p>
        <a href="/login" className="inline-block mt-4 px-4 py-2 rounded-lg bg-coaches-blue text-white text-xs font-semibold hover:bg-coaches-blue-dark transition-colors">Sign in with Family account</a>
      </div>
    );
  }

  // ── Not logged in → registration form ──
  return (
    <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 flex flex-col gap-5 backdrop-blur-sm">
      <div>
        <h1 className="text-white text-xl font-bold">Create Family Account</h1>
        <p className="text-gray-400 text-sm mt-1">
          Follow <span className="text-white font-semibold">{player.name}</span>&apos;s schedule and get game day info.
        </p>
      </div>

      <form action={registerAction} className="flex flex-col gap-4">
        <input type="hidden" name="player_id"    value={playerID} />
        <input type="hidden" name="relationship"  value={relationship} />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Full Name</label>
          <input
            name="full_name"
            type="text"
            required
            autoComplete="name"
            className={inputCls}
            placeholder="Jane Smith"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputCls}
            placeholder="jane@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className={inputCls}
            placeholder="At least 6 characters"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Relationship to {player.name}
          </p>
          <div className="flex gap-2 flex-wrap">
            {RELATIONSHIPS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRelationship(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  relationship === r
                    ? "bg-coaches-blue border-coaches-blue text-white"
                    : "border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {formState?.error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="shrink-0" /> {formState.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-2xl bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white font-semibold text-base transition-colors mt-1"
        >
          {pending ? "Creating account…" : <>Create Account <ChevronRight size={18} /></>}
        </button>

        <p className="text-center text-gray-600 text-xs">
          Already have a family account?{" "}
          <a href={`/login`} className="text-coaches-blue hover:text-blue-300 transition-colors">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}

// ── Page wrapper ────────────────────────────────────────────────────────────

export default function JoinFamilyPage() {
  return (
    <div className="min-h-screen bg-coaches-navy flex flex-col items-center justify-center px-5 py-10">
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
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-coaches-blue" />
            </div>
          }
        >
          <JoinContent />
        </Suspense>
      </div>
    </div>
  );
}
