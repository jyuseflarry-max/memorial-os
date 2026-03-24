import DashboardLayout from "@/components/DashboardLayout";
import PastPlansCard from "@/components/PastPlansCard";

export default function ViewPlansPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">View Plans</h1>
        <p className="text-gray-400 text-xs font-mono mt-0.5">ALL SAVED PRACTICE PLANS</p>
      </div>
      <PastPlansCard showViewButton />
    </DashboardLayout>
  );
}
