import React from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../lib/authContext";

export default function Layout() {
  const { profileType } = useParams();
  const { name, logout } = useAuth();

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <Link to="/">Trocar perfil</Link>
        <Link to={`/checklist/${profileType}/new`}>Nova Inspeção</Link>
        <Link to={`/checklist/${profileType}/inspections`}>Inspeções</Link>
        <Link to={`/checklist/${profileType}/analytics`}>Análise</Link>
        {profileType === "mpsc" && <Link to={`/checklist/${profileType}/units`}>Unidades</Link>}
        <span style={{ marginLeft: "auto" }}>
          {name ? `${name} · ` : ""}
          {name && (
            <button onClick={logout} type="button">
              Sair
            </button>
          )}
        </span>
      </nav>
      <Outlet />
    </div>
  );
}
