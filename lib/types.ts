export type PortfolioPosition = {
  assetSymbol: string;
  quantity: number;
  averagePrice: number;
  currency: string;
};

export type ReconcilePortfolioAssetPayload = {
  assetSymbol: string;
  expectedQuantity: number;
  currentQuantity: number;
  difference: number;
  status: "OK" | "DIVERGENTE";
  reason: string;
};

export type ReconcilePortfolioPayload = {
  totalAssets: number;
  matchedAssets: number;
  divergentAssets: number;
  assets: ReconcilePortfolioAssetPayload[];
};

export type IncomeTaxAssetSummaryPayload = {
  assetSymbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currency: string;
};

export type IncomeTaxCompanySummaryPayload = {
  companyCode: string;
  totalQuantity: number;
  consolidatedAveragePrice: number;
  totalCost: number;
  currency: string;
  assets: IncomeTaxAssetSummaryPayload[];
};

export type IncomeTaxYearSummaryPayload = {
  year: number;
  companies: IncomeTaxCompanySummaryPayload[];
};

export type ErrorResponse = {
  errors: string[];
};

export type RegisterMovementPayload = {
  assetSymbol: string;
  type: number;
  quantity: number;
  unitPrice: number;
  currency: string;
  occurredAtUtc?: string;
};

export type AuthenticateUserPayload = {
  userId: string;
  fullName: string;
  email: string;
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
};

export type CurrentUserPayload = {
  userId: string;
  fullName: string;
  email: string;
  userStatus: string;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
};

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
};

export type StatementEntryType =
  | "Buy"
  | "Sell"
  | "Income"
  | "Fee"
  | "Tax"
  | "Adjustment"
  | "CorporateAction";

export type StatementEntryPayload = {
  id: string;
  type: StatementEntryType;
  description: string;
  assetSymbol?: string | null;
  quantity?: number | null;
  unitPriceAmount?: number | null;
  grossAmount: number;
  netAmount: number;
  currency: string;
  occurredAtUtc: string;
  source: string;
  referenceId?: string | null;
  metadata?: string | null;
};

export type ImportInvestmentsSpreadsheetPayload = {
  processedFiles: number;
  totalRowsRead: number;
  importedMovements: number;
  importedStatementEntries: number;
  skippedRows: number;
  warnings: string[];
};

export type CorporateEventType = "TickerChange" | "Split" | "ReverseSplit";

export type RegisterCorporateEventPayload = {
  type: CorporateEventType;
  sourceAssetSymbol: string;
  targetAssetSymbol?: string | null;
  factor: number;
  effectiveAtUtc: string;
  notes?: string | null;
};

export type RegisterCorporateEventResult = {
  eventId: string;
  affectedOperations: number;
};

export type CorporateEventPayload = {
  id: string;
  type: CorporateEventType;
  sourceAssetSymbol: string;
  targetAssetSymbol?: string | null;
  factor: number;
  effectiveAtUtc: string;
  notes?: string | null;
  appliedAtUtc: string;
};
