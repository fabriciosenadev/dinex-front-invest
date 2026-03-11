"use client";

import { FormEvent, useMemo, useState } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { classifyAssetWithCatalog, AssetClass } from "../../../lib/assetClassification";
import { AssetDefinitionPayload, PortfolioPosition, ReconcilePortfolioPayload } from "../../../lib/types";

type PortfolioSectionProps = {
  positions: PortfolioPosition[];
  assetDefinitions: AssetDefinitionPayload[];
  reconcileResult: ReconcilePortfolioPayload | null;
  reconcileLoading: boolean;
  onReconcile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReconcileFileChange: (file: File | null) => void;
  showReconcile?: boolean;
};

export function PortfolioSection({
  positions,
  assetDefinitions,
  reconcileResult,
  reconcileLoading,
  onReconcile,
  onReconcileFileChange,
  showReconcile = true
}: PortfolioSectionProps) {
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [onlyRv, setOnlyRv] = useState(true);
  const [onlyFractional, setOnlyFractional] = useState(false);
  const [assetClassFilter, setAssetClassFilter] = useState<"all" | AssetClass>("all");
  const [sortBy, setSortBy] = useState<"asset" | "quantity-desc" | "quantity-asc">("asset");
  const [reconcileSearch, setReconcileSearch] = useState("");
  const [onlyDivergent, setOnlyDivergent] = useState(false);

  const portfolioView = useMemo(() => {
    const search = portfolioSearch.trim().toUpperCase();
    const filtered = positions
      .filter((position) => {
        if (search && !position.assetSymbol.toUpperCase().includes(search)) {
          return false;
        }

        if (onlyRv && !isLikelyVariableIncome(position.assetSymbol)) {
          return false;
        }

        if (onlyFractional && !isFractional(position.quantity)) {
          return false;
        }

        const assetClass = classifyAsset(position.assetSymbol, assetDefinitions);
        if (assetClassFilter !== "all" && assetClass !== assetClassFilter) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (sortBy === "quantity-desc") {
          return right.quantity - left.quantity;
        }

        if (sortBy === "quantity-asc") {
          return left.quantity - right.quantity;
        }

        return left.assetSymbol.localeCompare(right.assetSymbol, "pt-BR");
      });

    const total = filtered.reduce((accumulator, position) => accumulator + position.quantity, 0);
    const fractionalCount = filtered.filter((position) => isFractional(position.quantity)).length;
    return { filtered, total, fractionalCount };
  }, [positions, portfolioSearch, onlyRv, onlyFractional, assetClassFilter, sortBy]);

  const reconcileView = useMemo(() => {
    if (!reconcileResult) {
      return [];
    }

    const search = reconcileSearch.trim().toUpperCase();
    return reconcileResult.assets.filter((asset) => {
      if (search && !asset.assetSymbol.toUpperCase().includes(search)) {
        return false;
      }

      if (onlyDivergent && asset.status === "OK") {
        return false;
      }

      return true;
    });
  }, [reconcileResult, reconcileSearch, onlyDivergent]);

  const sankeyData = useMemo(() => {
    const source = portfolioView.filtered;
    if (source.length === 0) {
      return { nodes: [], links: [] };
    }

    const totalValue = source.reduce((acc, position) => acc + (position.quantity * position.averagePrice), 0);
    if (totalValue <= 0) {
      return { nodes: [], links: [] };
    }

    const nodes = [{ id: "Carteira", classLabel: "outro" as AssetClass }];
    const links: Array<{ source: string; target: string; value: number }> = [];
    const classNodeIds = new Set<string>();
    const assetNodeIds = new Set<string>();

    for (const position of source) {
      const value = position.quantity * position.averagePrice;
      if (value <= 0) {
        continue;
      }

      const classLabel = classifyAssetLabel(position.assetSymbol, assetDefinitions);
      const classKey = `classe:${classLabel}`;
      const assetKey = `ativo:${position.assetSymbol}`;
      const assetClass = classifyAsset(position.assetSymbol, assetDefinitions);

      if (!classNodeIds.has(classKey)) {
        classNodeIds.add(classKey);
        nodes.push({ id: classKey, classLabel: assetClass });
      }

      if (!assetNodeIds.has(assetKey)) {
        assetNodeIds.add(assetKey);
        nodes.push({ id: assetKey, classLabel: assetClass });
      }

      links.push({ source: classKey, target: assetKey, value: toPercent(value, totalValue) });
    }

    const classTotals = new Map<string, number>();
    for (const link of links) {
      if (!link.source.startsWith("classe:")) {
        continue;
      }

      classTotals.set(link.source, (classTotals.get(link.source) ?? 0) + link.value);
    }

    for (const [classKey, total] of classTotals.entries()) {
      links.push({ source: "Carteira", target: classKey, value: total });
    }

    return { nodes, links };
  }, [portfolioView.filtered, assetDefinitions]);

  return (
    <>
      <section className="card">
        <h2>Carteira</h2>
        <div className="grid portfolio-filters">
          <label>
            Buscar ativo
            <input value={portfolioSearch} onChange={(event) => setPortfolioSearch(event.target.value)} placeholder="Ex.: ITSA4" />
          </label>

          <label>
            Ordenar
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "asset" | "quantity-desc" | "quantity-asc")}>
              <option value="asset">Ativo (A-Z)</option>
              <option value="quantity-desc">Quantidade (maior primeiro)</option>
              <option value="quantity-asc">Quantidade (menor primeiro)</option>
            </select>
          </label>

          <label>
            Classe
            <select value={assetClassFilter} onChange={(event) => setAssetClassFilter(event.target.value as "all" | AssetClass)}>
              <option value="all">Todas</option>
              <option value="acao">Ação</option>
              <option value="fii">FII</option>
              <option value="rf">Renda fixa</option>
              <option value="direito">Direito</option>
              <option value="etf">ETF</option>
              <option value="bdr">BDR</option>
              <option value="outro">Outro</option>
            </select>
          </label>
        </div>
        <div className="inline-actions">
          <button type="button" className={`tab-button ${onlyRv ? "active" : ""}`} onClick={() => setOnlyRv((value) => !value)}>
            {onlyRv ? "Somente RV" : "RV + RF"}
          </button>
          <button
            type="button"
            className={`tab-button ${onlyFractional ? "active" : ""}`}
            onClick={() => setOnlyFractional((value) => !value)}
          >
            {onlyFractional ? "Somente fracionados" : "Mostrar todos"}
          </button>
        </div>
        <p className="status">
          Ativos exibidos: {portfolioView.filtered.length} | Quantidade total: {portfolioView.total.toFixed(2)} | Fracionados:{" "}
          {portfolioView.fractionalCount}
        </p>
        <table>
          <thead>
            <tr>
              <th>Ativo</th>
              <th>Classe</th>
              <th>Quantidade</th>
              <th>Preco Medio</th>
              <th>Valor Total</th>
              <th>Moeda</th>
            </tr>
          </thead>
          <tbody>
            {portfolioView.filtered.map((position) => (
              <tr key={position.assetSymbol} className={isFractional(position.quantity) ? "row-fractional" : undefined}>
                <td>{position.assetSymbol}</td>
                <td>
                  <span className={`badge-class badge-${classifyAsset(position.assetSymbol, assetDefinitions)}`}>
                    {classifyAssetLabel(position.assetSymbol, assetDefinitions)}
                  </span>
                </td>
                <td>
                  {position.quantity}
                  {isFractional(position.quantity) && <span className="badge-warn">fracionado</span>}
                </td>
                <td>{formatMoney(position.averagePrice, position.currency)}</td>
                <td>{formatMoney(position.quantity * position.averagePrice, position.currency)}</td>
                <td>{position.currency}</td>
              </tr>
            ))}
            {portfolioView.filtered.length === 0 && (
              <tr>
                <td colSpan={6}>Sem posicoes ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Sankey da Carteira</h2>
        <p className="status">Proporção percentual (100%) por classe e ativo com base no filtro atual.</p>
        <div className="sankey-chart-wrap">
          {sankeyData.links.length > 0 ? (
            <ResponsiveSankey
              data={sankeyData}
              margin={{ top: 20, right: 140, bottom: 20, left: 20 }}
              align="justify"
              valueFormat={(value) => `${Number(value).toFixed(2).replace(".", ",")}%`}
              colors={(node) => getClassColor((node as { classLabel?: AssetClass }).classLabel ?? "outro")}
              nodeOpacity={0.95}
              nodeHoverOthersOpacity={0.35}
              nodeThickness={18}
              nodeSpacing={18}
              nodeBorderWidth={0}
              linkOpacity={0.45}
              linkHoverOthersOpacity={0.1}
              enableLinkGradient
              labelPosition="outside"
              labelOrientation="horizontal"
              labelPadding={12}
              labelTextColor="#17315f"
            />
          ) : (
            <p className="status">Sem dados suficientes para gerar o Sankey.</p>
          )}
        </div>
      </section>

      {showReconcile && (
        <section className="card">
          <h2>Reconciliação com relatório de posição</h2>
          <form onSubmit={onReconcile}>
            <div className="grid">
              <label>
                Relatório consolidado (.xlsx)
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => onReconcileFileChange(event.currentTarget.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="row-actions">
              <button type="submit" disabled={reconcileLoading}>
                {reconcileLoading ? "Reconciliando..." : "Reconciliar Carteira"}
              </button>
            </div>
          </form>

          {reconcileResult && (
            <>
              <p className="status">
                Ativos: {reconcileResult.totalAssets} | OK: {reconcileResult.matchedAssets} | Divergentes:{" "}
                {reconcileResult.divergentAssets}
              </p>
              <div className="grid portfolio-filters">
                <label>
                  Buscar no resultado
                  <input value={reconcileSearch} onChange={(event) => setReconcileSearch(event.target.value)} placeholder="Ex.: KLBN4" />
                </label>
              </div>
              <div className="inline-actions">
                <button
                  type="button"
                  className={`tab-button ${onlyDivergent ? "active" : ""}`}
                  onClick={() => setOnlyDivergent((value) => !value)}
                >
                  {onlyDivergent ? "Somente divergentes" : "Todos os resultados"}
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Esperado</th>
                    <th>Atual</th>
                    <th>Diferença</th>
                    <th>Status</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {reconcileView.map((asset) => (
                    <tr key={asset.assetSymbol} className={asset.status !== "OK" ? "row-divergent" : undefined}>
                      <td>{asset.assetSymbol}</td>
                      <td>{asset.expectedQuantity}</td>
                      <td>{asset.currentQuantity}</td>
                      <td>{asset.difference}</td>
                      <td>{asset.status}</td>
                      <td>{asset.reason}</td>
                    </tr>
                  ))}
                  {reconcileView.length === 0 && (
                    <tr>
                      <td colSpan={6}>Nenhum resultado para o filtro selecionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </>
  );
}

function toSankeyValue(value: number) {
  return value.toFixed(2);
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

function getClassColor(assetClass: AssetClass) {
  const colors: Record<AssetClass, string> = {
    acao: "#1f77b4",
    fii: "#2ca02c",
    rf: "#9467bd",
    direito: "#ff7f0e",
    etf: "#17becf",
    bdr: "#e377c2",
    outro: "#7f7f7f"
  };

  return colors[assetClass];
}

function isLikelyVariableIncome(assetSymbol: string) {
  const normalized = assetSymbol.trim().toUpperCase();
  return /^[A-Z]{4,5}\d{1,2}$/.test(normalized);
}

function isFractional(value: number) {
  return Math.abs(value - Math.trunc(value)) > 0.000001;
}

function classifyAsset(assetSymbol: string, assetDefinitions: AssetDefinitionPayload[]): AssetClass {
  return classifyAssetWithCatalog(assetSymbol, assetDefinitions);
}

function classifyAssetLabel(assetSymbol: string, assetDefinitions: AssetDefinitionPayload[]): string {
  const map: Record<AssetClass, string> = {
    acao: "Ação",
    fii: "FII",
    rf: "Renda fixa",
    direito: "Direito",
    etf: "ETF",
    bdr: "BDR",
    outro: "Outro"
  };
  return map[classifyAsset(assetSymbol, assetDefinitions)];
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}
