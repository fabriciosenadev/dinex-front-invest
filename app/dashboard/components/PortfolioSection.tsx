"use client";

import { FormEvent, useMemo, useState } from "react";
import { PortfolioPosition, ReconcilePortfolioPayload } from "../../../lib/types";

type PortfolioSectionProps = {
  positions: PortfolioPosition[];
  reconcileResult: ReconcilePortfolioPayload | null;
  reconcileLoading: boolean;
  onReconcile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReconcileFileChange: (file: File | null) => void;
};

export function PortfolioSection({
  positions,
  reconcileResult,
  reconcileLoading,
  onReconcile,
  onReconcileFileChange
}: PortfolioSectionProps) {
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [onlyRv, setOnlyRv] = useState(true);
  const [onlyFractional, setOnlyFractional] = useState(false);
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
  }, [positions, portfolioSearch, onlyRv, onlyFractional, sortBy]);

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
              <th>Quantidade</th>
              <th>Preco Medio</th>
              <th>Moeda</th>
            </tr>
          </thead>
          <tbody>
            {portfolioView.filtered.map((position) => (
              <tr key={position.assetSymbol} className={isFractional(position.quantity) ? "row-fractional" : undefined}>
                <td>{position.assetSymbol}</td>
                <td>
                  {position.quantity}
                  {isFractional(position.quantity) && <span className="badge-warn">fracionado</span>}
                </td>
                <td>{position.averagePrice.toFixed(2)}</td>
                <td>{position.currency}</td>
              </tr>
            ))}
            {portfolioView.filtered.length === 0 && (
              <tr>
                <td colSpan={4}>Sem posicoes ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

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
    </>
  );
}

function isLikelyVariableIncome(assetSymbol: string) {
  const normalized = assetSymbol.trim().toUpperCase();
  return /^[A-Z]{4,5}\d{1,2}$/.test(normalized);
}

function isFractional(value: number) {
  return Math.abs(value - Math.trunc(value)) > 0.000001;
}
