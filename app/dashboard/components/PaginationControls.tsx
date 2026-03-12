"use client";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  itemCount: number;
  loading?: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
};

export function PaginationControls({
  page,
  pageSize,
  itemCount,
  loading = false,
  onPageChange,
  onPageSizeChange
}: PaginationControlsProps) {
  const hasPrevious = page > 1;
  const hasNext = itemCount >= pageSize;

  return (
    <div className="pagination-controls">
      <div className="inline-actions">
        <button type="button" className="button-secondary" disabled={!hasPrevious || loading} onClick={() => onPageChange(page - 1)}>
          Anterior
        </button>
        <span className="status pagination-label">Página {page}</span>
        <button type="button" className="button-secondary" disabled={!hasNext || loading} onClick={() => onPageChange(page + 1)}>
          Próxima
        </button>
      </div>
      <label className="pagination-size">
        Itens por página
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} disabled={loading}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </label>
    </div>
  );
}

