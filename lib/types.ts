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
