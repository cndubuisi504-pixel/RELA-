export type AdminOverviewMetrics = {
  totalUsers: number;
  totalBusinesses: number;
  completedBusinesses: number;
  incompleteBusinesses: number;
  activeSubscriptions: number;
  totalSubscriptionRevenueKobo: number;
  mrrKobo: number;
  totalDocuments: number;
  totalInvoices: number;
  totalReceipts: number;
  totalQuotations: number;
  totalDocumentVolumeKobo: number;
  totalDocumentCollectedKobo: number;
  totalApiReceipts: number;
  totalApiVolume: number;
  activeApiKeys: number;
};

export type TimelinePoint = {
  date: string;
  label: string;
  signups: number;
  businesses: number;
  documents: number;
  apiReceipts: number;
  volume: number; // in Naira
  collected: number; // in Naira
};

export type AdminBusiness = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  email: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  isComplete: boolean;
  missingFields: string[];
  plan: string;
  subscriptionStatus: string;
  docCount: number;
  totalVolumeKobo: number;
  totalCollectedKobo: number;
  defaultCurrency: string;
  defaultMode: string;
  createdAt: string;
  setupCompletedAt: string | null;
  lastSignInAt: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  plan: string;
  subscriptionStatus: string;
  hasBusiness: boolean;
  businessName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AdminSubscription = {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  amountKobo: number;
  currency: string;
  provider: string;
  providerReference: string;
  startedAt: string | null;
  endsAt: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
};

export type AdminSubscriptionEvent = {
  id: string;
  eventType: string;
  reference: string;
  status: string;
  processingError: string | null;
  customerEmail: string | null;
  amountKobo: number | null;
  createdAt: string;
};

export type AdminApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  isTest: boolean;
  status: string;
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  createdAt: string;
  receiptsCount: number;
};

export type AdminApiReceipt = {
  id: string;
  receiptNumber: string;
  orderNumber: string | null;
  businessName: string;
  customerName: string;
  customerEmail: string | null;
  totalAmount: number;
  currency: string;
  isTest: boolean;
  status: string;
  keyName: string;
  createdAt: string;
};

export type AdminFullData = {
  metrics: AdminOverviewMetrics;
  timeline: TimelinePoint[];
  businesses: AdminBusiness[];
  users: AdminUser[];
  subscriptions: AdminSubscription[];
  subscriptionEvents: AdminSubscriptionEvent[];
  apiKeys: AdminApiKey[];
  apiReceipts: AdminApiReceipt[];
};
