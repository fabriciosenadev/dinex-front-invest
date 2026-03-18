"use client";

import { FormEvent } from "react";
import { AssetDefinitionPayload, AssetTypePayload } from "../../../lib/types";
import { PaginationControls } from "./PaginationControls";

type AssetCatalogForm = {
  symbol: string;
  type: AssetTypePayload;
  name: string;
  document: string;
  country: string;
  currency: string;
  sector: string;
  segment: string;
  shareClass: string;
  cvmCode: string;
  fiiCategory: string;
  administrator: string;
  manager: string;
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
  pagination: {
    page: number;
    pageSize: number;
    onPageChange: (nextPage: number) => void;
    onPageSizeChange: (nextPageSize: number) => void;
  };
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
  onRefresh,
  pagination
}: AssetCatalogSectionProps) {
  const isStock = form.type === "Stock";
  const isFii = form.type === "Fii";

  return (
    <section className="card">
      <h2>Cadastro de Ativos</h2>
      <form className="grid form-grid-two" onSubmit={onSubmit}>
        <label>
          Codigo
          <input
            value={form.symbol}
            onChange={(event) => onChange({ ...form, symbol: event.target.value.toUpperCase() })}
            placeholder="Ex.: ITSA4"
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

        <label>
          Nome do ativo (opcional)
          <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="Ex.: Itausa S.A." />
        </label>
        <label>
          Documento/CNPJ (opcional)
          <input
            value={form.document}
            onChange={(event) => onChange({ ...form, document: event.target.value.toUpperCase() })}
            placeholder="Ex.: 61.532.644/0001-15"
          />
        </label>
        <label>
          Pais (opcional)
          <input value={form.country} onChange={(event) => onChange({ ...form, country: event.target.value })} placeholder="Brasil" />
        </label>
        <label>
          Moeda (opcional)
          <input
            value={form.currency}
            onChange={(event) => onChange({ ...form, currency: event.target.value.toUpperCase() })}
            placeholder="BRL"
          />
        </label>
        <label>
          Setor (opcional)
          <input value={form.sector} onChange={(event) => onChange({ ...form, sector: event.target.value })} placeholder="Ex.: Financeiro" />
        </label>
        <label>
          Segmento (opcional)
          <input value={form.segment} onChange={(event) => onChange({ ...form, segment: event.target.value })} placeholder="Ex.: Bancos" />
        </label>

        {isStock && (
          <>
            <label>
              Classe da acao (opcional)
              <input value={form.shareClass} onChange={(event) => onChange({ ...form, shareClass: event.target.value })} placeholder="ON, PN..." />
            </label>
            <label>
              Codigo CVM (opcional)
              <input value={form.cvmCode} onChange={(event) => onChange({ ...form, cvmCode: event.target.value })} placeholder="Ex.: 12345" />
            </label>
          </>
        )}

        {isFii && (
          <>
            <label>
              Categoria FII (opcional)
              <input value={form.fiiCategory} onChange={(event) => onChange({ ...form, fiiCategory: event.target.value })} placeholder="Papel, Tijolo..." />
            </label>
            <label>
              Administrador (opcional)
              <input value={form.administrator} onChange={(event) => onChange({ ...form, administrator: event.target.value })} placeholder="Ex.: BRL Trust" />
            </label>
            <label className="full-width">
              Gestor (opcional)
              <input value={form.manager} onChange={(event) => onChange({ ...form, manager: event.target.value })} placeholder="Ex.: BTG Pactual" />
            </label>
          </>
        )}

        <label className="full-width">
          Observacoes (opcional)
          <input value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} placeholder="Ex.: Declarado em Bens e Direitos." />
        </label>
        <div className="full-width row-actions">
          <button type="submit" disabled={loading}>
            {editingAssetId ? "Salvar Edicao" : "Salvar Ativo"}
          </button>
          {editingAssetId && (
            <button type="button" className="button-secondary" onClick={onCancelEdit} disabled={loading}>
              Cancelar
            </button>
          )}
          <button type="button" className="button-secondary" onClick={onRefresh} disabled={loading}>
            Atualizar Ativos
          </button>
        </div>
      </form>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Tipo</th>
              <th>Nome</th>
              <th>Documento</th>
              <th>Setor/Segmento</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.symbol}</td>
                <td>{mapTypeLabel(asset.type)}</td>
                <td>{asset.name?.trim() ? asset.name : "-"}</td>
                <td>{asset.document?.trim() ? asset.document : "-"}</td>
                <td>{renderSectorSegment(asset)}</td>
                <td>
                  <div className="inline-actions">
                    <button type="button" className="button-small" onClick={() => onEdit(asset)} disabled={loading}>
                      Editar
                    </button>
                    <button type="button" className="button-small button-danger" onClick={() => onDelete(asset.id)} disabled={loading}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum ativo cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        itemCount={assets.length}
        loading={loading}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
      />
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

function renderSectorSegment(asset: AssetDefinitionPayload): string {
  const sector = asset.sector?.trim();
  const segment = asset.segment?.trim();

  if (sector && segment) {
    return `${sector} / ${segment}`;
  }

  if (sector) {
    return sector;
  }

  if (segment) {
    return segment;
  }

  return "-";
}
