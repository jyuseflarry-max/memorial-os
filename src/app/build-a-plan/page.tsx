"use client";

import { Suspense } from "react";
import PlanEditor from "@/components/planner/PlanEditor";

export default function BuildAPlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanEditor mode="new" />
    </Suspense>
  );
}
