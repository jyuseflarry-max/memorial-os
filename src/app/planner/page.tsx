"use client";

import { Suspense } from "react";
import PlanEditor from "@/components/planner/PlanEditor";

export default function PlannerPage() {
  return (
    <Suspense fallback={null}>
      <PlanEditor mode="edit" />
    </Suspense>
  );
}
