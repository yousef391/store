import AuthGuard from "@/components/dashboard/AuthGuard";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata = {
  title: "ROVA Admin — Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div dir="ltr" className="flex min-h-screen bg-background w-full max-w-full overflow-x-hidden" style={{ fontFamily: "var(--font-dm)" }}>
        <Sidebar />
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden md:ml-56 lg:ml-64 p-3 sm:p-4 md:p-6 lg:p-8 pt-14 md:pt-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
