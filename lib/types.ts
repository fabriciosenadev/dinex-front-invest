export type PortfolioPosition = {
  assetSymbol: string;
  quantity: number;
  averagePrice: number;
  currency: string;
};

export type OperationResult<T> = {
  data: T;
  errors: string[];
  succeeded: boolean;
  isNotFound: boolean;
  internalServerError: boolean;
};

export type RegisterMovementPayload = {
  assetSymbol: string;
  type: number;
  quantity: number;
  unitPrice: number;
  currency: string;
  occurredAtUtc?: string;
};
