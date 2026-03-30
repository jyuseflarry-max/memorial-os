"use client";
import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

interface Props {
  instanceId:      string;
  confirmedAt:     string | null;
  onConfirmed?:    () => void;
}

export function ReceiptButton({ instanceId, confirmedAt, onConfirmed }: Props) {
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(!!confirmedAt);

  if (done) {
    return (
      <span className="flex items-center gap-1 text-green-400 text-[10px] font-mono">
        <CheckCircle size={12} /> Confirmed
      </span>
    );
  }

  async function confirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/receipt/${instanceId}`, { method: "POST" });
      if (res.ok) {
        setDone(true);
        onConfirmed?.();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={confirm}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coaches-blue/10 border border-coaches-blue/30 text-coaches-blue text-xs font-semibold hover:bg-coaches-blue/20 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
      Confirm Receipt
    </button>
  );
}
