import { redirect } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { StorageMeter } from "@/components/layout/storage-meter";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getSessionUser } from "@/lib/api/auth-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>
        <div className="border-t border-border pt-4">
          <StorageMeter
            usedBytes={user.storageUsedBytes}
            quotaBytes={user.storageQuotaBytes}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          username={user.username}
          email={user.email}
          usedBytes={user.storageUsedBytes}
          quotaBytes={user.storageQuotaBytes}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
