export type PortfolioPosition = {
  assetSymbol: string;
  quantity: number;
  averagePrice: number;
  currency: string;
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
