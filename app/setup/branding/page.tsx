import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupShell } from "@/components/setup/SetupShell";
import { BrandingForm } from "@/components/setup/BrandingForm";

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

  const pathFromUrl = (url: string | null) => {
    if (!url) null;
    const marker = "/storage/v1/object/public/branding/";
    const i = url?.indexOf(marker) ?? -1;
    return i >= 0 ? decodeURIComponent(url!.slice(i + marker.length)) : null;
  };

  return (
    <SetupShell
      current="branding"
      title="Make it yours"
      subtitle="Upload your logo and signature. You can change either later in Settings."
    >
      <BrandingForm
        businessId={business.id}
        logoUrl={business.logo_url}
        logoPath={pathFromUrl(business.logo_url)}
        signatureUrl={business.signature_url}
        signaturePath={pathFromUrl(business.signature_url)}
        defaultTheme={business.default_theme ?? "classic"}
        brandPrimary={business.brand_primary}
        brandSecondary={business.brand_secondary}
      />
    </SetupShell>
  );
}
