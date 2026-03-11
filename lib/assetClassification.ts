import { AssetDefinitionPayload } from "./types";

export type AssetClass = "acao" | "fii" | "rf" | "direito" | "etf" | "bdr" | "outro";

const assetClassOverrides: Record<string, AssetClass> = {
  TAEE11: "acao"
};

export function classifyAssetWithCatalog(assetSymbol: string, assetDefinitions: AssetDefinitionPayload[]): AssetClass {
  const normalized = normalizeAssetSymbol(assetSymbol);
  const catalogType = resolveCatalogType(normalized, assetDefinitions);
  if (catalogType) {
    return catalogType;
  }

  return classifyAssetFallback(normalized);
}

function resolveCatalogType(normalizedAssetSymbol: string, assetDefinitions: AssetDefinitionPayload[]): AssetClass | null {
  const entry = assetDefinitions.find((asset) => normalizeAssetSymbol(asset.symbol) === normalizedAssetSymbol);
  if (!entry) {
    return null;
  }

  if (entry.type === "Stock") return "acao";
  if (entry.type === "Fii") return "fii";
  if (entry.type === "Etf") return "etf";
  if (entry.type === "Bdr") return "bdr";
  if (entry.type === "FixedIncome") return "rf";
  return "outro";
}

function classifyAssetFallback(normalized: string): AssetClass {
  if (assetClassOverrides[normalized]) {
    return assetClassOverrides[normalized];
  }

  if (normalized.startsWith("TESOURO") || normalized.startsWith("LCI-") || normalized.startsWith("LCA-") || normalized.startsWith("CDB-")) {
    return "rf";
  }

  if (/^[A-Z]{4,5}12$/.test(normalized)) {
    return "direito";
  }

  if (/^[A-Z]{4}39$/.test(normalized) || /^[A-Z]{4}11B$/.test(normalized)) {
    return "etf";
  }

  if (/^[A-Z]{4}34$/.test(normalized)) {
    return "bdr";
  }

  if (/^[A-Z]{4,5}11$/.test(normalized)) {
    return "fii";
  }

  if (/^[A-Z]{4,5}[3456]$/.test(normalized)) {
    return "acao";
  }

  return "outro";
}

function normalizeAssetSymbol(assetSymbol: string): string {
  return assetSymbol.trim().toUpperCase();
}
