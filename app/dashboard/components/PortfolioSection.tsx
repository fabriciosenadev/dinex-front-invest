"use client";

import { PortfolioPosition } from "../../../lib/types";

type PortfolioSectionProps = {
  positions: PortfolioPosition[];
};

export function PortfolioSection({ positions }: PortfolioSectionProps) {
  return (
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
  );
}
