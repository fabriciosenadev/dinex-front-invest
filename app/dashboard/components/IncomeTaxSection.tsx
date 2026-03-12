"use client";

import { useEffect, useMemo, useState } from "react";
import { classifyAssetWithCatalog } from "../../../lib/assetClassification";
import { AssetDefinitionPayload, IncomeTaxYearSummaryPayload, StatementEntryPayload } from "../../../lib/types";

type IncomeTaxSectionProps = {
  summary: IncomeTaxYearSummaryPayload[];
  assetDefinitions: AssetDefinitionPayload[];
  statementEntries: StatementEntryPayload[];
  onRefresh: () => Promise<void>;
};

export function IncomeTaxSection({ summary, assetDefinitions, statementEntries, onRefresh }: IncomeTaxSectionProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [assetTab, setAssetTab] = useState<"acao" | "fii" | "etf">("acao");

  useEffect(() => {
    if (summary.length === 0) {
      setSelectedYear(null);
      return;
    }

    if (selectedYear === null || !summary.some((item) => item.year === selectedYear)) {
      setSelectedYear(summary[0].year);
    }
  }, [summary, selectedYear]);

  const currentYearSummary = useMemo(() => {
    if (selectedYear === null) {
      return null;
    }

    return summary.find((item) => item.year === selectedYear) ?? null;
  }, [summary, selectedYear]);

  const availableTabs = useMemo(() => {
    if (!currentYearSummary) {
      return [] as Array<"acao" | "fii" | "etf">;
    }

    const classes = currentYearSummary.companies
      .flatMap((company) => company.assets)
      .map((asset) => classifyIncomeTaxAsset(asset.assetSymbol, assetDefinitions));

    const tabs: Array<"acao" | "fii" | "etf"> = [];
    if (classes.includes("acao")) {
      tabs.push("acao");
    }

    if (classes.includes("fii")) {
      tabs.push("fii");
    }

    if (classes.includes("etf")) {
      tabs.push("etf");
    }

    return tabs;
  }, [currentYearSummary, assetDefinitions]);

  useEffect(() => {
    if (availableTabs.length === 0) {
      return;
    }

    if (!availableTabs.includes(assetTab)) {
      setAssetTab(availableTabs[0]);
    }
  }, [assetTab, availableTabs]);

  const filteredCompanies = useMemo(() => {
    if (!currentYearSummary) {
      return [];
    }

    return currentYearSummary.companies
      .map((company) => {
        const assets = company.assets.filter((asset) => classifyIncomeTaxAsset(asset.assetSymbol, assetDefinitions) === assetTab);
        if (assets.length === 0) {
          return null;
        }

        const totalQuantity = assets.reduce((accumulator, asset) => accumulator + asset.quantity, 0);
        const totalCost = assets.reduce((accumulator, asset) => accumulator + asset.totalCost, 0);
        const consolidatedAveragePrice = totalQuantity === 0 ? 0 : totalCost / totalQuantity;

        return {
          ...company,
          assets,
          totalQuantity,
          totalCost,
          consolidatedAveragePrice
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [currentYearSummary, assetTab, assetDefinitions]);

  const totalCost = filteredCompanies.reduce((accumulator, company) => accumulator + company.totalCost, 0);
  const nonEquityAssets = useMemo(
    () =>
      filteredCompanies
        .flatMap((company) => company.assets)
        .sort((left, right) => left.assetSymbol.localeCompare(right.assetSymbol, "pt-BR")),
    [filteredCompanies]
  );
  const incomeByAssetAndType = useMemo(() => {
    if (selectedYear === null) {
      return [];
    }

    const accumulator = new Map<string, { assetSymbol: string; eventType: string; currency: string; totalNetAmount: number; entriesCount: number; assetClass: "acao" | "fii" | "etf" | "outro" }>();
    for (const entry of statementEntries) {
      const year = new Date(entry.occurredAtUtc).getUTCFullYear();
      if (year !== selectedYear || !isReceivedIncomeDescription(entry.description)) {
        continue;
      }

      const assetSymbol = (entry.assetSymbol ?? "-").trim().toUpperCase();
      const eventType = resolveIncomeEventType(entry.description);
      const entryClass = assetSymbol === "-" ? "outro" : classifyIncomeTaxAsset(assetSymbol, assetDefinitions);
      const key = `${assetSymbol}|${eventType}|${entry.currency}|${entryClass}`;
      const current = accumulator.get(key);
      if (!current) {
        accumulator.set(key, {
          assetSymbol,
          eventType,
          currency: entry.currency,
          totalNetAmount: entry.netAmount,
          entriesCount: 1,
          assetClass: entryClass
        });
      } else {
        current.totalNetAmount += entry.netAmount;
        current.entriesCount += 1;
      }
    }

    return Array.from(accumulator.values()).sort((left, right) => {
      const byAsset = left.assetSymbol.localeCompare(right.assetSymbol, "pt-BR");
      if (byAsset !== 0) {
        return byAsset;
      }

      return left.eventType.localeCompare(right.eventType, "pt-BR");
    });
  }, [selectedYear, statementEntries, assetDefinitions]);
  const incomeByAssetAndTypeForTab = useMemo(() => incomeByAssetAndType.filter((row) => row.assetClass === assetTab), [incomeByAssetAndType, assetTab]);
  const incomeByAsset = useMemo(() => {
    const accumulator = new Map<string, { dividend: number; jcp: number; rendimento: number; totalWithoutJcp: number; entriesCount: number }>();
    for (const row of incomeByAssetAndTypeForTab) {
      const key = row.assetSymbol;
      const event = normalizeIncomeEventType(row.eventType);
      const current = accumulator.get(key) ?? { dividend: 0, jcp: 0, rendimento: 0, totalWithoutJcp: 0, entriesCount: 0 };
      if (event === "dividend") {
        current.dividend += row.totalNetAmount;
        current.totalWithoutJcp += row.totalNetAmount;
      } else if (event === "jcp") {
        current.jcp += row.totalNetAmount;
      } else {
        current.rendimento += row.totalNetAmount;
        current.totalWithoutJcp += row.totalNetAmount;
      }

      current.entriesCount += row.entriesCount;
      accumulator.set(key, current);
    }

    return accumulator;
  }, [incomeByAssetAndTypeForTab]);
  const receivedIncomeTotalWithoutJcp = Array.from(incomeByAsset.values()).reduce((accumulator, row) => accumulator + row.totalWithoutJcp, 0);
  const receivedJcpTotal = Array.from(incomeByAsset.values()).reduce((accumulator, row) => accumulator + row.jcp, 0);
  const receivedIncomeEntriesCount = Array.from(incomeByAsset.values()).reduce((accumulator, row) => accumulator + row.entriesCount, 0);
  const transferredEntries = useMemo(() => {
    if (selectedYear === null) {
      return [];
    }

    return statementEntries.filter((entry) => {
      const year = new Date(entry.occurredAtUtc).getUTCFullYear();
      return year === selectedYear && isTransferredIncomeDescription(entry.description);
    });
  }, [selectedYear, statementEntries]);
  const transferredEntriesTotal = transferredEntries.reduce((accumulator, entry) => accumulator + entry.netAmount, 0);

  return (
    <section className="card">
      <div className="toolbar">
        <div>
          <h2 className="section-title">
            <span aria-hidden="true">📊</span>
            <span>Base para Imposto de Renda</span>
          </h2>
          <p className="status">
            {assetTab === "acao"
              ? "Consolidação por ano e por empresa (somando os ativos da mesma empresa)."
              : "Consolidação por ano e por ativo (foco no código de negociação)."}
          </p>
        </div>
        <button type="button" onClick={onRefresh}>
          Atualizar Base IR
        </button>
      </div>

      {summary.length > 0 && (
        <div className="grid portfolio-filters">
          <label>
            Ano-base
            <select value={selectedYear ?? ""} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {summary.map((item) => (
                <option key={item.year} value={item.year}>
                  {item.year}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {availableTabs.length > 0 && (
        <div className="tabs">
          {availableTabs.includes("acao") && (
            <button type="button" className={assetTab === "acao" ? "tab-button active" : "tab-button"} onClick={() => setAssetTab("acao")}>
              Ações
            </button>
          )}
          {availableTabs.includes("fii") && (
            <button type="button" className={assetTab === "fii" ? "tab-button active" : "tab-button"} onClick={() => setAssetTab("fii")}>
              FIIs
            </button>
          )}
          {availableTabs.includes("etf") && (
            <button type="button" className={assetTab === "etf" ? "tab-button active" : "tab-button"} onClick={() => setAssetTab("etf")}>
              ETFs
            </button>
          )}
        </div>
      )}

      {currentYearSummary !== null && availableTabs.length > 0 && (
        <>
          <p className="status">
            Proventos recebidos (sem transferidos): {receivedIncomeEntriesCount} lançamentos | Div+Rend:{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivedIncomeTotalWithoutJcp)} | JCP:{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivedJcpTotal)}
          </p>
          {transferredEntries.length > 0 && (
            <p className="status">
              Transferidos desconsiderados no ano: {transferredEntries.length} | Total:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(transferredEntriesTotal)}
            </p>
          )}
          <p className="status">
            {assetTab === "acao" ? `Empresas: ${filteredCompanies.length}` : `Ativos: ${nonEquityAssets.length}`} | Patrimônio (custo):{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCost)}
          </p>
          <div className="table-scroll">
            <table>
            <thead>
              {assetTab === "acao" ? (
                <tr>
                  <th>Empresa</th>
                  <th>Ativos</th>
                  <th>Quantidade Total</th>
                  <th>Preço Médio Consolidado</th>
                  <th>Valor Total</th>
                  <th>Dividendos</th>
                  <th>JCP</th>
                  <th>Rendimento</th>
                  <th>Total Div+Rend</th>
                  <th>Moeda</th>
                </tr>
              ) : (
                <tr>
                  <th>Ativo</th>
                  <th>Quantidade</th>
                  <th>Preço Médio</th>
                  <th>Valor Total</th>
                  <th>Dividendos</th>
                  <th>JCP</th>
                  <th>Rendimento</th>
                  <th>Total Div+Rend</th>
                  <th>Moeda</th>
                </tr>
              )}
            </thead>
            <tbody>
              {assetTab === "acao" &&
                filteredCompanies.map((company) => (
                  <tr key={company.companyCode}>
                    <td>{company.companyCode}</td>
                    <td>
                      {company.assets.map((asset) => asset.assetSymbol).join(", ")}
                      {company.assets.length > 1 && (
                        <details>
                          <summary>Ver detalhes dos ativos</summary>
                          <table className="subtable">
                            <thead>
                              <tr>
                                <th>Ativo</th>
                                <th>Quantidade</th>
                                <th>Preço Médio</th>
                                <th>Valor Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {company.assets.map((asset) => (
                                <tr key={asset.assetSymbol}>
                                  <td>{asset.assetSymbol}</td>
                                  <td>{asset.quantity}</td>
                                  <td>{formatMoney(asset.averagePrice, asset.currency)}</td>
                                  <td>{formatMoney(asset.totalCost, asset.currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )}
                    </td>
                    <td>{company.totalQuantity}</td>
                    <td>{formatMoney(company.consolidatedAveragePrice, company.currency)}</td>
                    <td>{formatMoney(company.totalCost, company.currency)}</td>
                    <td>{formatMoney(company.assets.reduce((sum, asset) => sum + (incomeByAsset.get(asset.assetSymbol)?.dividend ?? 0), 0), company.currency)}</td>
                    <td>{formatMoney(company.assets.reduce((sum, asset) => sum + (incomeByAsset.get(asset.assetSymbol)?.jcp ?? 0), 0), company.currency)}</td>
                    <td>{formatMoney(company.assets.reduce((sum, asset) => sum + (incomeByAsset.get(asset.assetSymbol)?.rendimento ?? 0), 0), company.currency)}</td>
                    <td>{formatMoney(company.assets.reduce((sum, asset) => sum + (incomeByAsset.get(asset.assetSymbol)?.totalWithoutJcp ?? 0), 0), company.currency)}</td>
                    <td>{company.currency}</td>
                  </tr>
                ))}
              {assetTab !== "acao" &&
                nonEquityAssets.map((asset) => (
                  <tr key={asset.assetSymbol}>
                    <td>{asset.assetSymbol}</td>
                    <td>{asset.quantity}</td>
                    <td>{formatMoney(asset.averagePrice, asset.currency)}</td>
                    <td>{formatMoney(asset.totalCost, asset.currency)}</td>
                    <td>{formatMoney((incomeByAsset.get(asset.assetSymbol)?.dividend ?? 0), asset.currency)}</td>
                    <td>{formatMoney((incomeByAsset.get(asset.assetSymbol)?.jcp ?? 0), asset.currency)}</td>
                    <td>{formatMoney((incomeByAsset.get(asset.assetSymbol)?.rendimento ?? 0), asset.currency)}</td>
                    <td>{formatMoney((incomeByAsset.get(asset.assetSymbol)?.totalWithoutJcp ?? 0), asset.currency)}</td>
                    <td>{asset.currency}</td>
                  </tr>
                ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={assetTab === "acao" ? 10 : 9}>Sem ativos dessa classe no ano selecionado.</td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </>
      )}

      {currentYearSummary !== null && availableTabs.length === 0 && (
        <p className="status">Sem ativos classificados como Ações, FIIs ou ETFs no ano selecionado.</p>
      )}
      {summary.length === 0 && <p className="status">Sem dados de movimentação para montar a base de IR.</p>}
    </section>
  );
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function classifyIncomeTaxAsset(assetSymbol: string, assetDefinitions: AssetDefinitionPayload[]): "acao" | "fii" | "etf" | "outro" {
  const assetClass = classifyAssetWithCatalog(assetSymbol, assetDefinitions);
  if (assetClass === "acao") {
    return "acao";
  }

  if (assetClass === "fii") {
    return "fii";
  }

  if (assetClass === "etf") {
    return "etf";
  }

  return "outro";
}

function isTransferredIncomeDescription(description: string): boolean {
  const normalized = description.trim().toLowerCase();
  return (
    normalized.includes("dividendo - transferido") ||
    normalized.includes("juros sobre capital próprio - transferido") ||
    normalized.includes("juros sobre capital proprio - transferido") ||
    normalized.includes("rendimento - transferido")
  );
}

function isReceivedIncomeDescription(description: string): boolean {
  const normalized = description.trim().toLowerCase();
  if (isTransferredIncomeDescription(description)) {
    return false;
  }

  return (
    normalized.includes("dividendo") ||
    normalized.includes("juros sobre capital próprio") ||
    normalized.includes("juros sobre capital proprio") ||
    normalized.includes("jcp") ||
    normalized.includes("rendimento") ||
    normalized.includes("provento")
  );
}

function resolveIncomeEventType(description: string): string {
  const normalized = description.trim().toLowerCase();
  if (normalized.includes("juros sobre capital próprio") || normalized.includes("juros sobre capital proprio") || normalized.includes("jcp")) {
    return "Juros Sobre Capital Próprio";
  }

  if (normalized.includes("dividendo")) {
    return "Dividendo";
  }

  if (normalized.includes("rendimento")) {
    return "Rendimento";
  }

  if (normalized.includes("provento")) {
    return "Provento";
  }

  return description;
}

function normalizeIncomeEventType(value: string): "dividend" | "jcp" | "rendimento" {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("juros sobre capital próprio") || normalized.includes("juros sobre capital proprio") || normalized.includes("jcp")) {
    return "jcp";
  }

  if (normalized.includes("dividendo")) {
    return "dividend";
  }

  return "rendimento";
}
