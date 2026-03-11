"use client";

export type DashboardTab = "movements" | "statement" | "corporate-events" | "portfolio" | "income-tax" | "assets";

type TabNavigationProps = {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
};

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: "movements", label: "Movimentacoes" },
  { id: "statement", label: "Extrato" },
  { id: "corporate-events", label: "Eventos" },
  { id: "portfolio", label: "Carteira" },
  { id: "income-tax", label: "Imposto de Renda" },
  { id: "assets", label: "Ativos" }
];

export function TabNavigation({ activeTab, onChange }: TabNavigationProps) {
  return (
    <section className="card">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "tab-button active" : "tab-button"}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  );
}
