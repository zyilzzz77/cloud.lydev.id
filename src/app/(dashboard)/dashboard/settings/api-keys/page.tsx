import type { Metadata } from "next";
import { ApiKeyManager } from "@/components/settings/api-key-manager";

export const metadata: Metadata = {
  title: "API Keys",
};

export default function ApiKeysSettingsPage() {
  return <ApiKeyManager />;
}
