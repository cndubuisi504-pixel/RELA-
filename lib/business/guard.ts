export type ProfileChecklistStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  isCompleted: boolean;
  isEssential?: boolean;
};

export type BusinessProfileCheck = {
  isComplete: boolean;
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: string[];
  steps: ProfileChecklistStep[];
};

export type BusinessDataForGuard = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
} | null | undefined;

/**
 * Checks document creation permission.
 * Users can create documents immediately once they have an account and basic business name.
 * Bank details, logo, signature, and address are completely optional and never block creation.
 */
export function canCreateDocuments(business: BusinessDataForGuard): {
  allowed: boolean;
  reason?: string;
} {
  if (!business || !business.name?.trim()) {
    return {
      allowed: false,
      reason: "Please enter your business name before creating documents.",
    };
  }
  return { allowed: true };
}

/**
 * Calculates profile completion progress and checklist items for the dashboard.
 * Total 5 milestones:
 * 1. Business Name & Phone (Essential — completed at setup)
 * 2. Business Address (Optional)
 * 3. Bank Account (Optional — recommended for invoices)
 * 4. Business Logo (Optional — branded invoices and receipts)
 * 5. Signature (Optional — formal authorization)
 */
export function checkBusinessProfileCompletion(
  business: BusinessDataForGuard,
): BusinessProfileCheck {
  if (!business) {
    return {
      isComplete: false,
      percentage: 0,
      completedCount: 0,
      totalCount: 5,
      missingFields: [
        "Business name",
        "Phone number",
        "Address",
        "Bank details",
        "Logo",
      ],
      steps: [
        {
          id: "essential",
          label: "Business name & phone",
          description: "Required to identify your business",
          href: "/setup/business",
          isCompleted: false,
          isEssential: true,
        },
        {
          id: "address",
          label: "Physical address",
          description: "Appears on documents & receipts",
          href: "/settings",
          isCompleted: false,
        },
        {
          id: "bank",
          label: "Bank account",
          description: "Let customers pay directly via bank transfer",
          href: "/settings",
          isCompleted: false,
        },
        {
          id: "logo",
          label: "Business logo",
          description: "Brand your invoices, receipts, and quotations",
          href: "/settings",
          isCompleted: false,
        },
        {
          id: "signature",
          label: "Authorized signature",
          description: "Add formal sign-off to your documents",
          href: "/settings",
          isCompleted: false,
        },
      ],
    };
  }

  const phone = (business.phone ?? "").trim();
  const address = (business.address ?? "").trim();
  const bankAcc = (business.bank_account_number ?? "").trim();
  const logo = (business.logo_url ?? "").trim();
  const signature = (business.signature_url ?? "").trim();
  const name = (business.name ?? "").trim();

  const hasEssential =
    name.length >= 2 &&
    phone.length >= 8 &&
    phone !== "+2348000000000" &&
    phone !== "08000000000";

  const hasAddress =
    address.length >= 5 && address.toLowerCase() !== "nigeria";

  const hasBank = bankAcc.length >= 8;
  const hasLogo = logo.length > 0;
  const hasSignature = signature.length > 0;

  const steps: ProfileChecklistStep[] = [
    {
      id: "essential",
      label: "Business name & phone",
      description: "Identifies your business on documents & WhatsApp",
      href: "/settings",
      isCompleted: Boolean(hasEssential),
      isEssential: true,
    },
    {
      id: "address",
      label: "Business address",
      description: "Display your physical location or shop address",
      href: "/settings",
      isCompleted: Boolean(hasAddress),
    },
    {
      id: "bank",
      label: "Bank account for transfers",
      description: "Recommended for invoices so customers know where to pay",
      href: "/settings",
      isCompleted: Boolean(hasBank),
    },
    {
      id: "logo",
      label: "Business logo",
      description: "Custom branding for your documents",
      href: "/settings",
      isCompleted: Boolean(hasLogo),
    },
    {
      id: "signature",
      label: "Authorized signature",
      description: "Formal sign-off on invoices & quotations",
      href: "/settings",
      isCompleted: Boolean(hasSignature),
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  const missingFields: string[] = [];
  if (!hasEssential) missingFields.push("Business name & phone");
  if (!hasAddress) missingFields.push("Physical address");
  if (!hasBank) missingFields.push("Bank account details");
  if (!hasLogo) missingFields.push("Business logo");
  if (!hasSignature) missingFields.push("Authorized signature");

  return {
    isComplete: completedCount === totalCount,
    percentage,
    completedCount,
    totalCount,
    missingFields,
    steps,
  };
}
