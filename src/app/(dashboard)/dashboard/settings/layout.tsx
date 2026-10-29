import { PageHeader } from "@/components/shared/page-header";
import { SettingsTabs } from "@/components/layout/settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, security, storage, plan, and API access."
      />
      <SettingsTabs />
      <div>{children}</div>
    </div>
  );
}
