"use client";

import { useEffect, useMemo, useState } from "react";
import { IncomeTaxYearSummaryPayload } from "../../../lib/types";

type IncomeTaxSectionProps = {
  summary: IncomeTaxYearSummaryPayload[];
  onRefresh: () => Promise<void>;
};

export function IncomeTaxSection({ summary, onRefresh }: IncomeTaxSectionProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [assetTab, setAssetTab] = useState<"acao" | "fii">("acao");

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

  const filteredCompanies = useMemo(() => {
    if (!currentYearSummary) {
      return [];
    }

    return currentYearSummary.companies
      .map((company) => {
        const assets = company.assets.filter((asset) => classifyIncomeTaxAsset(asset.assetSymbol) === assetTab);
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
  }, [currentYearSummary, assetTab]);

  const totalCost = filteredCompanies.reduce((accumulator, company) => accumulator + company.totalCost, 0);
  const fiiAssets = useMemo(
    () =>
      filteredCompanies
        .flatMap((company) => company.assets)
        .sort((left, right) => left.assetSymbol.localeCompare(right.assetSymbol, "pt-BR")),
    [filteredCompanies]
  );

  return (
    <section className="card">
      <div className="toolbar">
        <div>
          <h2>Base para Imposto de Renda</h2>
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

      <div className="tabs">
        <button type="button" className={assetTab === "acao" ? "tab-button active" : "tab-button"} onClick={() => setAssetTab("acao")}>
          Ações
        </button>
        <button type="button" className={assetTab === "fii" ? "tab-button active" : "tab-button"} onClick={() => setAssetTab("fii")}>
          FIIs
        </button>
      </div>

      {currentYearSummary !== null && (
        <>
          <p className="status">
            {assetTab === "acao" ? `Empresas: ${filteredCompanies.length}` : `Ativos: ${fiiAssets.length}`} | Patrimônio (custo):{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCost)}
          </p>
          <table>
            <thead>
              {assetTab === "acao" ? (
                <tr>
                  <th>Empresa</th>
                  <th>Ativos</th>
                  <th>Quantidade Total</th>
                  <th>Preço Médio Consolidado</th>
                  <th>Valor Total</th>
                  <th>Moeda</th>
                </tr>
              ) : (
                <tr>
                  <th>Ativo</th>
                  <th>Quantidade</th>
                  <th>Preço Médio</th>
                  <th>Valor Total</th>
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
                    <td>{company.currency}</td>
                  </tr>
                ))}
              {assetTab === "fii" &&
                fiiAssets.map((asset) => (
                  <tr key={asset.assetSymbol}>
                    <td>{asset.assetSymbol}</td>
                    <td>{asset.quantity}</td>
                    <td>{formatMoney(asset.averagePrice, asset.currency)}</td>
                    <td>{formatMoney(asset.totalCost, asset.currency)}</td>
                    <td>{asset.currency}</td>
                  </tr>
                ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={assetTab === "acao" ? 6 : 5}>Sem ativos dessa classe no ano selecionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
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

function classifyIncomeTaxAsset(assetSymbol: string): "acao" | "fii" | "outro" {
  const normalized = assetSymbol.trim().toUpperCase();
  if (normalized === "TAEE11") {
    return "acao";
  }

  if (/^[A-Z]{4,5}11$/.test(normalized)) {
    return "fii";
  }

  if (/^[A-Z]{4,5}[3456]$/.test(normalized)) {
    return "acao";
  }

  return "outro";
}
