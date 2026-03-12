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
  const [sankeyMode, setSankeyMode] = useState<"class-asset" | "class-only" | "asset-only">("class-asset");
  const [sankeyClassFilter, setSankeyClassFilter] = useState<"all" | AssetClass>("all");
  const [sankeyMaxAssets, setSankeyMaxAssets] = useState(15);

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
    const source = positions
      .map((position) => ({
        ...position,
        assetClass: classifyAsset(position.assetSymbol, assetDefinitions),
        value: position.quantity * position.averagePrice
      }))
      .filter((position) => position.value > 0)
      .filter((position) => (sankeyClassFilter === "all" ? true : position.assetClass === sankeyClassFilter))
      .sort((left, right) => right.value - left.value)
      .slice(0, sankeyMaxAssets);

    if (source.length === 0) {
      return { nodes: [], links: [] };
    }

    const totalValue = source.reduce((acc, position) => acc + position.value, 0);
    if (totalValue <= 0) {
      return { nodes: [], links: [] };
    }

    const nodes = [{ id: "Carteira", classLabel: "outro" as AssetClass }];
    const links: Array<{ source: string; target: string; value: number }> = [];
    const classNodeIds = new Set<string>();
    const assetNodeIds = new Set<string>();

    for (const position of source) {
      const classLabel = classifyAssetLabel(position.assetSymbol, assetDefinitions);
      const classKey = `classe:${classLabel}`;
      const assetKey = `ativo:${position.assetSymbol}`;
      const assetClass = position.assetClass;
      const percent = toPercent(position.value, totalValue);

      if (!classNodeIds.has(classKey)) {
        classNodeIds.add(classKey);
        nodes.push({ id: classKey, classLabel: assetClass });
      }

      if (!assetNodeIds.has(assetKey)) {
        assetNodeIds.add(assetKey);
        nodes.push({ id: assetKey, classLabel: assetClass });
      }

      if (sankeyMode === "class-asset") {
        links.push({ source: classKey, target: assetKey, value: percent });
      }

      if (sankeyMode === "asset-only") {
        links.push({ source: "Carteira", target: assetKey, value: percent });
      }
    }

    if (sankeyMode === "class-only" || sankeyMode === "class-asset") {
      const classTotals = new Map<string, number>();
      for (const position of source) {
        const classLabel = classifyAssetLabel(position.assetSymbol, assetDefinitions);
        const classKey = `classe:${classLabel}`;
        classTotals.set(classKey, (classTotals.get(classKey) ?? 0) + toPercent(position.value, totalValue));
      }

      for (const [classKey, total] of classTotals.entries()) {
        links.push({ source: "Carteira", target: classKey, value: total });
      }
    }

    if (sankeyMode === "class-only") {
      return {
        nodes: nodes.filter((node) => node.id === "Carteira" || node.id.startsWith("classe:")),
        links
      };
    }

    return { nodes, links };
  }, [positions, assetDefinitions, sankeyClassFilter, sankeyMaxAssets, sankeyMode]);

  const sankeyHeight = useMemo(() => {
    if (sankeyData.nodes.length === 0) {
      return 420;
    }

    return Math.max(420, Math.min(900, 220 + sankeyData.nodes.length * 20));
  }, [sankeyData.nodes.length]);

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
        <div className="toolbar">
          <p className="status">Proporção percentual por classe e ativo.</p>
          <div className="inline-actions sankey-controls">
            <label>
              Diagrama
              <select value={sankeyMode} onChange={(event) => setSankeyMode(event.target.value as "class-asset" | "class-only" | "asset-only")}>
                <option value="class-asset">Classe {'>'} Ativo</option>
                <option value="class-only">Somente classe</option>
                <option value="asset-only">Somente ativo</option>
              </select>
            </label>
            <label>
              Categoria
              <select value={sankeyClassFilter} onChange={(event) => setSankeyClassFilter(event.target.value as "all" | AssetClass)}>
                <option value="all">Completo</option>
                <option value="acao">Ações</option>
                <option value="fii">FIIs</option>
                <option value="etf">ETFs</option>
                <option value="rf">Renda fixa</option>
                <option value="direito">Direitos</option>
                <option value="bdr">BDRs</option>
                <option value="outro">Outros</option>
              </select>
            </label>
            <label>
              Ativos
              <select value={sankeyMaxAssets} onChange={(event) => setSankeyMaxAssets(Number(event.target.value))}>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
              </select>
            </label>
          </div>
        </div>
        <div className="sankey-chart-wrap" style={{ height: `${sankeyHeight}px` }}>
          {sankeyData.links.length > 0 ? (
            <ResponsiveSankey
              data={sankeyData}
              margin={{ top: 20, right: 140, bottom: 20, left: 20 }}
              align="justify"
              valueFormat={(value) => `${Number(value).toFixed(2).replace(".", ",")}%`}
              colors={(node) => getClassColor((node as { classLabel?: AssetClass }).classLabel ?? "outro")}
              theme={{
                labels: {
                  text: {
                    fill: "var(--sankey-label-color)"
                  }
                },
                tooltip: {
                  container: {
                    background: "var(--sankey-tooltip-bg)",
                    color: "var(--sankey-tooltip-text)",
                    border: "1px solid var(--sankey-tooltip-border)",
                    borderRadius: "8px",
                    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)"
                  }
                }
              }}
              nodeOpacity={0.95}
              nodeHoverOthersOpacity={0.35}
              nodeThickness={18}
              nodeSpacing={18}
              nodeBorderWidth={0}
              linkOpacity={0.88}
              linkHoverOthersOpacity={0.2}
              enableLinkGradient={false}
              labelPosition="outside"
              labelOrientation="horizontal"
              labelPadding={12}
              labelTextColor="var(--sankey-label-color)"
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
    outro: "#4fa3ff"
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
