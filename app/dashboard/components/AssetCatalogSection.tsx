"use client";

import { FormEvent } from "react";
import { AssetDefinitionPayload, AssetTypePayload } from "../../../lib/types";

type AssetCatalogForm = {
  symbol: string;
  type: AssetTypePayload;
  notes: string;
};

type AssetCatalogSectionProps = {
  form: AssetCatalogForm;
  assets: AssetDefinitionPayload[];
  loading: boolean;
  editingAssetId: string | null;
  onChange: (next: AssetCatalogForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onEdit: (asset: AssetDefinitionPayload) => void;
  onCancelEdit: () => void;
  onDelete: (assetId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

const assetTypeOptions: Array<{ value: AssetTypePayload; label: string }> = [
  { value: "Stock", label: "Acao" },
  { value: "Fii", label: "FII" },
  { value: "Etf", label: "ETF" },
  { value: "Bdr", label: "BDR" },
  { value: "FixedIncome", label: "Renda fixa" },
  { value: "Other", label: "Outro" }
];

export function AssetCatalogSection({
  form,
  assets,
  loading,
  editingAssetId,
  onChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
  onRefresh
}: AssetCatalogSectionProps) {
  return (
    <section className="card">
      <h2>Cadastro de Ativos</h2>
      <form className="grid" onSubmit={onSubmit}>
        <label>
          Codigo
          <input
            value={form.symbol}
            onChange={(event) => onChange({ ...form, symbol: event.target.value.toUpperCase() })}
            placeholder="GOLD11"
            required
          />
        </label>
        <label>
          Tipo
          <select value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as AssetTypePayload })}>
            {assetTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="full-width">
          Observacoes (opcional)
          <input value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} placeholder="Opcional" />
        </label>
        <div className="full-width row-actions">
          <button type="submit" disabled={loading}>
            {editingAssetId ? "Salvar Edicao" : "Salvar Ativo"}
          </button>
          {editingAssetId && (
            <button type="button" onClick={onCancelEdit} disabled={loading}>
              Cancelar
            </button>
          )}
          <button type="button" onClick={onRefresh} disabled={loading}>
            Atualizar Ativos
          </button>
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Tipo</th>
            <th>Observacoes</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.symbol}</td>
              <td>{mapTypeLabel(asset.type)}</td>
              <td>{asset.notes?.trim() ? asset.notes : "-"}</td>
              <td>
                <button type="button" onClick={() => onEdit(asset)} disabled={loading}>
                  Editar
                </button>
                <button type="button" onClick={() => onDelete(asset.id)} disabled={loading}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={4}>Nenhum ativo cadastrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function mapTypeLabel(value: AssetTypePayload): string {
  if (value === "Stock") return "Acao";
  if (value === "Fii") return "FII";
  if (value === "Etf") return "ETF";
  if (value === "Bdr") return "BDR";
  if (value === "FixedIncome") return "Renda fixa";
  return "Outro";
}
