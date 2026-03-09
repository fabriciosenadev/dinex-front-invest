"use client";

import { FormEvent } from "react";
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
  return (
    <>
      <section className="card">
        <h2>Carteira</h2>
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
            {positions.map((position) => (
              <tr key={position.assetSymbol}>
                <td>{position.assetSymbol}</td>
                <td>{position.quantity}</td>
                <td>{position.averagePrice.toFixed(2)}</td>
                <td>{position.currency}</td>
              </tr>
            ))}
            {positions.length === 0 && (
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
                {reconcileResult.assets.map((asset) => (
                  <tr key={asset.assetSymbol}>
                    <td>{asset.assetSymbol}</td>
                    <td>{asset.expectedQuantity}</td>
                    <td>{asset.currentQuantity}</td>
                    <td>{asset.difference}</td>
                    <td>{asset.status}</td>
                    <td>{asset.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}
