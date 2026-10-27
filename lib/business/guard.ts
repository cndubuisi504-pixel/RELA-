export type BusinessProfileCheck = {
  isComplete: boolean;
  missingFields: string[];
};

/**
 * Checks whether a business has provided real contact and bank details.
 * Users who skipped onboarding explore with placeholder details
 * (e.g. phone: "+2348000000000", address: "Nigeria", no bank account).
 * Document creation (receipts, invoices, quotations) is blocked until real
 * details are supplied so documents sent to customers are professional and verifiable.
 */
export function checkBusinessProfileCompletion(
  business: {
    phone?: string | null;
    address?: string | null;
    bank_account_number?: string | null;
    bank_name?: string | null;
  } | null | undefined,
): BusinessProfileCheck {
  if (!business) {
    return { isComplete: false, missingFields: ["Business profile"] };
  }

  const missing: string[] = [];
  const phone = (business.phone ?? "").trim();
  const address = (business.address ?? "").trim();
  const bankAcc = (business.bank_account_number ?? "").trim();

  // Guard against missing or placeholder phone (+2348000000000 is used by skipSetupToExplore)
  if (!phone || phone === "+2348000000000" || phone === "08000000000") {
    missing.push("Valid phone number");
  }

  // Guard against missing or placeholder address ("Nigeria" is used by skipSetupToExplore)
  if (!address || address.toLowerCase() === "nigeria" || address.length < 5) {
    missing.push("Physical business address");
  }

  // Guard against missing bank account number
  if (!bankAcc || bankAcc.length < 8) {
    missing.push("Bank account details");
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}
