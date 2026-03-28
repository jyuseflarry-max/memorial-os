"use client";

import { Users, Link2, Share2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import FamilyShell from "@/components/FamilyShell";
import { useAuth } from "@/context/AuthContext";

const RELATIONSHIP_COLORS: Record<string, string> = {
  Parent:      "text-blue-400 bg-blue-400/10 border-blue-400/25",
  Guardian:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  Grandparent: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  Other:       "text-gray-400 bg-gray-400/10 border-gray-400/25",
};

function CopyLinkButton({ playerId }: { playerId: string }) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/join/family?playerID=${playerId}`;
    if (navigator.share) {
      navigator.share({
        title: "Join my team on The Coach's OS",
        text: "Tap this link to create a free family account and follow the schedule.",
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
    <button
      type="button"
      onClick={handleShare}
      title="Add a family member for this player"
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors ${
        copied
          ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
          : "text-purple-400 bg-purple-400/10 border-purple-400/25 hover:bg-purple-400/20"
      }`}
    >
      {copied ? <CheckCircle2 size={10} /> : <Share2 size={10} />}
      {copied ? "Copied!" : "Add Family"}
    </button>
  );
}

export default function FamilyPlayersPage() {
  const { authUser } = useAuth();
  const linkedPlayers = authUser?.linkedPlayers ?? [];

  return (
    <FamilyShell>
      <div className="max-w-lg mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">My Players</h1>
          <p className="text-gray-400 text-sm mt-0.5">Players linked to your family account.</p>
        </div>

        {linkedPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={36} className="text-gray-700" />
            <p className="text-gray-500 text-sm font-mono">No players linked yet.</p>
            <p className="text-gray-600 text-xs text-center max-w-[260px]">
              Ask your coach for a player join link. Clicking it will add them to your account.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            {linkedPlayers.map((lp, i) => {
              const relColor = RELATIONSHIP_COLORS[lp.relationship] ?? RELATIONSHIP_COLORS.Other;
              return (
                <div
                  key={lp.playerId}
                  className={`flex items-center gap-4 px-4 py-4 ${i < linkedPlayers.length - 1 ? "border-b border-gray-700/60" : ""}`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <span className="text-purple-400 font-bold text-sm">
                      {lp.playerName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name + relationship */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{lp.playerName}</p>
                    <span className={`inline-block mt-0.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${relColor}`}>
                      {lp.relationship}
                    </span>
                  </div>

                  {/* Share link (so another family member can easily join for this player) */}
                  <CopyLinkButton playerId={lp.playerId} />
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-gray-500 text-xs leading-relaxed">
            <span className="text-gray-300 font-semibold">Adding more players?</span>{" "}
            Ask your coach for the player&apos;s join link. Once you click it while signed in, they&apos;ll be added to your account automatically.
          </p>
        </div>
      </div>
    </FamilyShell>
  );
}
