import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupShell } from "@/components/setup/SetupShell";
import { BrandingForm } from "@/components/setup/BrandingForm";
import { pathFromBrandingUrl } from "@/lib/branding/url";

export const metadata = { title: "Branding · Setup" };

export default async function BrandingStep() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup/branding");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, logo_url, signature_url, default_theme, brand_primary, brand_secondary")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) redirect("/setup/business");

  return (
    <SetupShell
      current="branding"
      title="Make it yours"
      subtitle="Upload your logo and signature. You can change either later in Settings."
    >
      <BrandingForm
        businessId={business.id}
        logoUrl={business.logo_url}
        logoPath={pathFromBrandingUrl(business.logo_url)}
        signatureUrl={business.signature_url}
        signaturePath={pathFromBrandingUrl(business.signature_url)}
        defaultTheme={business.default_theme ?? "classic"}
        brandPrimary={business.brand_primary}
        brandSecondary={business.brand_secondary}
      />
    </SetupShell>
  );
}
