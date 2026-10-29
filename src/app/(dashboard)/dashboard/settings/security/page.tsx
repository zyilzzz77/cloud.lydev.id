import type { Metadata } from "next";
import { LogoutAllButton } from "@/components/settings/logout-all-button";
import { PasswordForm } from "@/components/settings/password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Security",
};

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-4">
      <PasswordForm />
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Sign out every device that currently holds a session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoutAllButton />
        </CardContent>
      </Card>
    </div>
  );
}
