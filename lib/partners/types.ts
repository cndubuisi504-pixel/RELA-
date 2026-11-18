export type Agency = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  status: "active" | "suspended" | "pending";
  lowBalanceThresholdKobo: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyRole = "owner" | "admin" | "developer" | "viewer";

export type AgencyMember = {
  id: string;
  agencyId: string;
  userId: string;
  role: AgencyRole;
  userEmail?: string;
  userName?: string;
  createdAt: string;
};

export type AgencyWallet = {
  id: string;
  agencyId: string;
  balanceKobo: number;
  currency: string;
  totalFundedKobo: number;
  totalSpentKobo: number;
  createdAt: string;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  walletId: string;
  agencyId: string;
  projectId: string | null;
  businessId: string | null;
  projectName?: string | null;
  businessName?: string | null;
  type: "deposit" | "receipt_deduction" | "refund" | "adjustment";
  amountKobo: number;
  balanceAfterKobo: number;
  currency: string;
  reference: string;
  idempotencyKey?: string | null;
  status: "pending" | "success" | "failed";
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ClientBusiness = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  status: "active" | "suspended" | "transferred" | "archived";
  spendingLimitKobo: number | null;
  spentKobo: number;
  projectsCount: number;
  totalReceiptsCount: number;
  relationshipId: string;
  createdAt: string;
};

export type Project = {
  id: string;
  agencyId: string;
  businessId: string;
  businessName: string;
  name: string;
  websiteUrl: string | null;
  environment: "sandbox" | "production";
  status: "active" | "inactive" | "revoked";
  receiptsCount: number;
  lastReceiptAt: string | null;
  hasActiveKey: boolean;
  keyPrefix?: string;
  keyHint?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  keyHint: string | null;
  projectId: string;
  projectName?: string;
  agencyId: string;
  businessId: string | null;
  businessName?: string;
  environment: "sandbox" | "production";
  status: "active" | "revoked";
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  createdAt: string;
};

export type ApiRequestLog = {
  id: string;
  projectId: string | null;
  projectName?: string | null;
  businessId: string | null;
  businessName?: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string | null;
  createdAt: string;
  errorMessage: string | null;
};

export type AgencyDashboardStats = {
  agency: Agency;
  wallet: AgencyWallet;
  totalClients: number;
  totalWebsites: number;
  activeIntegrations: number;
  receiptsGenerated: number;
  walletBalanceNaira: number;
  recentTransactions: WalletTransaction[];
  recentLogs: ApiRequestLog[];
};
