import AuthGuard from "@/components/dashboard/AuthGuard";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata = {
  title: "ROVA Admin — Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background" style={{ fontFamily: "var(--font-dm)" }}>
        <Sidebar />
        <main className="flex-1 md:ml-56 lg:ml-64 p-4 md:p-6 lg:p-8 pt-14 md:pt-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
