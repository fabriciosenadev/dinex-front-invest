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
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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

  useEffect(() => {
    if (!currentYearSummary) {
      setSelectedMonth(null);
      return;
    }

    const uniqueMonths = (currentYearSummary.monthlyTaxation ?? []).map((row) => row.month).sort((a, b) => a - b);
    if (uniqueMonths.length === 0) {
      setSelectedMonth(null);
      return;
    }

    if (selectedMonth === null || !uniqueMonths.includes(selectedMonth)) {
      setSelectedMonth(uniqueMonths[0]);
    }
  }, [currentYearSummary, selectedMonth]);

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
      const current = accumulator.get(key) ?? { dividend: 0, jcp: 0, rendimento: 0, totalWithoutJcp: 0, entriesCount: 0 };

      if (assetTab === "fii") {
        current.rendimento += row.totalNetAmount;
        current.totalWithoutJcp += row.totalNetAmount;
      } else {
        const event = normalizeIncomeEventType(row.eventType);
        if (event === "dividend") {
          current.dividend += row.totalNetAmount;
          current.totalWithoutJcp += row.totalNetAmount;
        } else if (event === "jcp") {
          current.jcp += row.totalNetAmount;
        } else {
          current.rendimento += row.totalNetAmount;
          current.totalWithoutJcp += row.totalNetAmount;
        }
      }

      current.entriesCount += row.entriesCount;
      accumulator.set(key, current);
    }

    return accumulator;
  }, [incomeByAssetAndTypeForTab, assetTab]);
  const receivedIncomeTotalWithoutJcp = Array.from(incomeByAsset.values()).reduce((accumulator, row) => accumulator + row.totalWithoutJcp, 0);
  const receivedJcpTotal = Array.from(incomeByAsset.values()).reduce((accumulator, row) => accumulator + row.jcp, 0);
  const receivedIncomeEntriesCount = Array.from(incomeByAsset.values()).reduce((accumulator, row) => accumulator + row.entriesCount, 0);

  const monthlyTaxation = useMemo(() => currentYearSummary?.monthlyTaxation ?? [], [currentYearSummary]);
  const availableMonths = useMemo(() => monthlyTaxation.map((item) => item.month).sort((a, b) => a - b), [monthlyTaxation]);
  const monthlyForSelection = useMemo(
    () => (selectedMonth === null ? null : monthlyTaxation.find((item) => item.month === selectedMonth)) ?? null,
    [monthlyTaxation, selectedMonth]
  );
  const monthlySummaryRows = useMemo(() => {
    if (!monthlyForSelection) {
      return [] as Array<{
        assetClass: "acao" | "fii" | "etf" | "outro";
        modality: "common" | "daytrade";
        monthlyResult: number;
        compensatedLoss: number;
        taxBase: number;
        aliquot: number;
        taxDue: number;
        irrfCollected: number;
        irrfCompensated: number;
        darf: number;
        carriedLoss: number;
      }>;
    }

    const carryByBucket = new Map<string, number>();
    for (const carry of monthlyForSelection.endingLossCarryByBucket) {
      carryByBucket.set(`${carry.assetClass}|${carry.tradeMode}`, carry.lossCarry);
    }

    const accumulator = new Map<string, { assetClass: string; modality: string; monthlyResult: number; compensatedLoss: number; taxBase: number; aliquot: number; taxDue: number; irrfCollected: number; irrfCompensated: number; darf: number; carriedLoss: number }>();
    monthlyForSelection.buckets.forEach((bucket) => {
      const key = `${bucket.assetClass}|${bucket.tradeMode}`;
      const current = accumulator.get(key) ?? {
        assetClass: bucket.assetClass,
        modality: bucket.tradeMode,
        monthlyResult: 0,
        compensatedLoss: 0,
        taxBase: 0,
        aliquot: 0,
        taxDue: 0,
        irrfCollected: 0,
        irrfCompensated: 0,
        darf: 0,
        carriedLoss: carryByBucket.get(key) ?? 0
      };

      current.monthlyResult += bucket.grossResult;
      current.compensatedLoss += bucket.lossCompensated;
      current.taxBase += bucket.taxableBase;
      current.aliquot = bucket.taxRate * 100;
      current.taxDue += bucket.taxDue;
      current.irrfCollected += bucket.irrfMonth;
      current.irrfCompensated += bucket.irrfCompensated;
      current.darf += bucket.darfGenerated;
      current.carriedLoss = carryByBucket.get(key) ?? current.carriedLoss;
      accumulator.set(key, current);
    });

    return Array.from(accumulator.values()).sort((left, right) => {
      const byClass = left.assetClass.localeCompare(right.assetClass, "pt-BR");
      if (byClass !== 0) {
        return byClass;
      }
      return left.modality.localeCompare(right.modality, "pt-BR");
    });
  }, [monthlyForSelection]);
  const selectedMonthLabel = selectedMonth === null ? null : formatMonthLabel(selectedMonth);
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
  const realizedForTab = useMemo(() => {
    if (!currentYearSummary) {
      return {
        assets: [] as Array<{
          assetSymbol: string;
          soldQuantity: number;
          grossProceeds: number;
          costBasis: number;
          realizedResult: number;
          currency: string;
        }>,
        totalProfit: 0,
        totalLoss: 0,
        netResult: 0
      };
    }

    const assets = currentYearSummary.realized.assets
      .filter((asset) => classifyIncomeTaxAsset(asset.assetSymbol, assetDefinitions) === assetTab)
      .sort((left, right) => left.assetSymbol.localeCompare(right.assetSymbol, "pt-BR"));
    const totalProfit = assets.filter((asset) => asset.realizedResult > 0).reduce((accumulator, asset) => accumulator + asset.realizedResult, 0);
    const totalLoss = assets.filter((asset) => asset.realizedResult < 0).reduce((accumulator, asset) => accumulator + Math.abs(asset.realizedResult), 0);
    const netResult = assets.reduce((accumulator, asset) => accumulator + asset.realizedResult, 0);

    return {
      assets,
      totalProfit,
      totalLoss,
      netResult
    };
  }, [currentYearSummary, assetDefinitions, assetTab]);

  const compensationByYear = useMemo(() => {
    return summary
      .slice()
      .sort((left, right) => left.year - right.year)
      .map((item) => {
        const lastMonth = (item.monthlyTaxation ?? []).slice().sort((left, right) => right.month - left.month)[0];
        const carriedLoss = (lastMonth?.endingLossCarryByBucket ?? []).reduce((accumulator, row) => accumulator + row.lossCarry, 0);

        return {
          year: item.year,
          totalProfit: item.realized.totalProfit,
          totalLoss: item.realized.totalLoss,
          netResult: item.realized.netResult,
          carriedLoss
        };
      });
  }, [summary]);

  const compensationOverall = useMemo(() => {
    const totalProfit = compensationByYear.reduce((accumulator, year) => accumulator + year.totalProfit, 0);
    const totalLoss = compensationByYear.reduce((accumulator, year) => accumulator + year.totalLoss, 0);
    const netResult = compensationByYear.reduce((accumulator, year) => accumulator + year.netResult, 0);

    const allMonths = summary
      .flatMap((item) => (item.monthlyTaxation ?? []).map((month) => ({ year: item.year, month })))
      .sort((left, right) => {
        const byYear = left.year - right.year;
        if (byYear !== 0) {
          return byYear;
        }

        return left.month.month - right.month.month;
      });

    const lastMonth = allMonths[allMonths.length - 1]?.month;
    const carriedLoss = (lastMonth?.endingLossCarryByBucket ?? []).reduce((accumulator, row) => accumulator + row.lossCarry, 0);

    return {
      totalProfit,
      totalLoss,
      netResult,
      carriedLoss
    };
  }, [compensationByYear, summary]);

  return (
    <section className="card">
      <div className="income-tax-header">
        <div className="income-tax-header-row">
          <h2>Base para Imposto de Renda</h2>
          <button type="button" className="button-secondary" onClick={onRefresh}>
            Atualizar Base IR
          </button>
        </div>
        <p className="status">
          {assetTab === "acao"
            ? "Consolidação por ano e por empresa (somando os ativos da mesma empresa)."
            : "Consolidação por ano e por ativo (foco no código de negociação)."}
        </p>
      </div>

      {summary.length > 0 && (
        <div className="grid portfolio-filters income-tax-year-filter">
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
          {assetTab === "fii" ? (
            <p className="status">
              Rendimentos recebidos (sem transferidos): {receivedIncomeEntriesCount} lançamentos | Total:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivedIncomeTotalWithoutJcp)}
            </p>
          ) : (
            <p className="status">
              Proventos recebidos (sem transferidos): {receivedIncomeEntriesCount} lançamentos | Div+Rend:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivedIncomeTotalWithoutJcp)} | JCP:{" "}
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receivedJcpTotal)}
            </p>
          )}
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
              ) : assetTab === "fii" ? (
                <tr>
                  <th>Ativo</th>
                  <th>Quantidade</th>
                  <th>Preço Médio</th>
                  <th>Valor Total</th>
                  <th>Rendimento</th>
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
              {assetTab === "fii" &&
                nonEquityAssets.map((asset) => (
                  <tr key={asset.assetSymbol}>
                    <td>{asset.assetSymbol}</td>
                    <td>{asset.quantity}</td>
                    <td>{formatMoney(asset.averagePrice, asset.currency)}</td>
                    <td>{formatMoney(asset.totalCost, asset.currency)}</td>
                    <td>{formatMoney((incomeByAsset.get(asset.assetSymbol)?.rendimento ?? 0), asset.currency)}</td>
                    <td>{asset.currency}</td>
                  </tr>
                ))}
              {assetTab === "etf" &&
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
              {((assetTab === "acao" && filteredCompanies.length === 0) || (assetTab !== "acao" && nonEquityAssets.length === 0)) && (
                <tr>
                  <td colSpan={assetTab === "acao" ? 10 : assetTab === "fii" ? 6 : 9}>Sem ativos dessa classe no ano selecionado.</td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
          <p className="status">
            Resultado realizado no ano (vendas) | Lucro: {formatMoney(realizedForTab.totalProfit, "BRL")} | Prejuízo: {formatMoney(realizedForTab.totalLoss, "BRL")} | Líquido: {formatMoney(realizedForTab.netResult, "BRL")}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Quantidade Vendida</th>
                  <th>Valor de Venda</th>
                  <th>Custo Médio Realizado</th>
                  <th>Resultado</th>
                  <th>Moeda</th>
                </tr>
              </thead>
              <tbody>
                {realizedForTab.assets.map((asset) => (
                  <tr key={asset.assetSymbol}>
                    <td>{asset.assetSymbol}</td>
                    <td>{asset.soldQuantity}</td>
                    <td>{formatMoney(asset.grossProceeds, asset.currency)}</td>
                    <td>{formatMoney(asset.costBasis, asset.currency)}</td>
                    <td>{formatMoney(asset.realizedResult, asset.currency)}</td>
                    <td>{asset.currency}</td>
                  </tr>
                ))}
                {realizedForTab.assets.length === 0 && (
                  <tr>
                    <td colSpan={6}>Sem vendas dessa classe no ano selecionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {compensationByYear.length > 0 && (
            <section className="income-tax-compensation">
              <h3>Saldo de Compensação</h3>
              <p className="status">
                Visão consolidada para identificar lucro/prejuízo realizado e prejuízo acumulado disponível para compensação.
              </p>
              <div className="income-tax-compensation-cards">
                <div className="status">
                  <strong>Geral | Lucro: {formatMoney(compensationOverall.totalProfit, "BRL")}</strong>
                </div>
                <div className="status">
                  <strong>Geral | Prejuízo: {formatMoney(compensationOverall.totalLoss, "BRL")}</strong>
                </div>
                <div className="status">
                  <strong>Geral | Líquido: {formatMoney(compensationOverall.netResult, "BRL")}</strong>
                </div>
                <div className="status">
                  <strong>Prejuízo acumulado disponível: {formatMoney(compensationOverall.carriedLoss, "BRL")}</strong>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Ano</th>
                      <th>Lucro realizado</th>
                      <th>Prejuízo realizado</th>
                      <th>Líquido realizado</th>
                      <th>Prejuízo acumulado ao fim do ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compensationByYear.map((row) => (
                      <tr key={row.year}>
                        <td>{row.year}</td>
                        <td>{formatMoney(row.totalProfit, "BRL")}</td>
                        <td>{formatMoney(row.totalLoss, "BRL")}</td>
                        <td>{formatMoney(row.netResult, "BRL")}</td>
                        <td>{formatMoney(row.carriedLoss, "BRL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {selectedMonthLabel && monthlySummaryRows.length > 0 && (
            <section className="monthly-section">
              <div className="monthly-header">
                <div>
                  <strong>Apuração Mensal</strong>
                  <p>{selectedMonthLabel}</p>
                </div>
                <div className="monthly-filters">
                  {availableMonths.length > 0 && (
                    <label>
                      Mês
                      <select value={selectedMonth ?? ""} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>
                            {formatMonthLabel(month)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
              <div className="monthly-summary-grid">
                <div>
                  <span>Imposto total</span>
                  <strong>{formatMoney(monthlyForSelection?.totalTax ?? 0, "BRL")}</strong>
                </div>
                <div>
                  <span>IRRF no mês</span>
                  <strong>{formatMoney(monthlyForSelection?.totalIrrfMonth ?? 0, "BRL")}</strong>
                </div>
                <div>
                  <span>IRRF compensado</span>
                  <strong>{formatMoney(monthlyForSelection?.totalIrrfCompensated ?? 0, "BRL")}</strong>
                </div>
                <div>
                  <span>DARF do mês</span>
                  <strong>{formatMoney(monthlyForSelection?.darfDue ?? 0, "BRL")}</strong>
                </div>
                <div>
                  <span>Prejuízo acumulado</span>
                  <strong>{formatMoney(monthlySummaryRows.reduce((accumulator, row) => accumulator + row.carriedLoss, 0), "BRL")}</strong>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>Modalidade</th>
                      <th>Resultado</th>
                      <th>Prejuízo Comp.</th>
                      <th>Base</th>
                      <th>Alíquota</th>
                      <th>Imposto devido</th>
                      <th>IRRF acumulado</th>
                      <th>IRRF compensado</th>
                      <th>DARF</th>
                      <th>Prejuízo remanescente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummaryRows.map((row) => (
                      <tr key={`${row.assetClass}-${row.modality}`}>
                        <td>{row.assetClass}</td>
                        <td>{row.modality === "daytrade" ? "day trade" : "comum"}</td>
                        <td>{formatMoney(row.monthlyResult, "BRL")}</td>
                        <td>{formatMoney(row.compensatedLoss, "BRL")}</td>
                        <td>{formatMoney(row.taxBase, "BRL")}</td>
                        <td>{row.aliquot.toFixed(2)}%</td>
                        <td>{formatMoney(row.taxDue, "BRL")}</td>
                        <td>{formatMoney(row.irrfCollected, "BRL")}</td>
                        <td>{formatMoney(row.irrfCompensated, "BRL")}</td>
                        <td>{formatMoney(row.darf, "BRL")}</td>
                        <td>{formatMoney(row.carriedLoss, "BRL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
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

function formatMonthLabel(month: number) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, month - 1, 1));
  } catch {
    return `${month}`;
  }
}



