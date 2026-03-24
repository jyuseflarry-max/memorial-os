"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import DrillPicker from "./DrillPicker";
import { Drill } from "@/types/drill";

interface Props {
  drills: Drill[];
  onAdd: (drill: Drill) => void;
  onClose: () => void;
  onNewDrill?: () => void;
}

export default function DrillSheet({ drills, onAdd, onClose, onNewDrill }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 print:hidden" onClick={onClose} />
      {/* Sheet — slides up from bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-gray-900 border-t border-gray-700 rounded-t-2xl print:hidden" style={{ height: "85vh" }}>
        {/* Drag handle bar */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
          <p className="text-white font-semibold text-sm">Add Drill</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* DrillPicker fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <DrillPicker drills={drills} onAdd={onAdd} onNewDrill={onNewDrill} />
        </div>
      </div>
    </>
  );
}
