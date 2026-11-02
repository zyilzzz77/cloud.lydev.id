import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeaturesSection } from "@/components/marketing/features-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroSection } from "@/components/marketing/hero-section";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { getSessionUser } from "@/lib/api/auth-guard";

export const metadata: Metadata = {
  title: "Simpan di satu tempat, akses ngebut dari mana saja",
};

export default async function HomePage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="overflow-hidden">
      <HeroSection />
      <FeaturesSection />
      <PricingPreview />
      <FinalCta />
    </div>
  );
}
