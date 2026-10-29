import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/profile-form";
import { requireSessionUser } from "@/lib/api/auth-guard";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfileSettingsPage() {
  const user = await requireSessionUser();

  return <ProfileForm initialUsername={user.username} initialEmail={user.email} />;
}
