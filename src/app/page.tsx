import DashboardLayout from "@/components/DashboardLayout";
import CalendarWidget from "@/components/CalendarWidget";

export default function CalendarPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">Calendar</h1>
      </div>
      <CalendarWidget />
    </DashboardLayout>
  );
}
