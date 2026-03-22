import Sidebar from "./Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-900 font-sans print:bg-white overflow-hidden">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 print:p-6 min-w-0">{children}</main>
    </div>
  );
}
