"use client";

import { CurrentUserPayload } from "../../../lib/types";

type UserSessionCardProps = {
  currentUser: CurrentUserPayload | null;
  onLogout: () => void;
};

export function UserSessionCard({ currentUser, onLogout }: UserSessionCardProps) {
  return (
    <section className="card">
      <div className="toolbar">
        <div>
          <h2>Usuario autenticado</h2>
          <p className="status">
            {currentUser?.fullName} ({currentUser?.email})
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={onLogout}>
          Sair
        </button>
      </div>
    </section>
  );
}
