import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/authContext";

export default function ProfileSelectPage() {
  const navigate = useNavigate();
  const { name } = useAuth();

  return (
    <div className="app-shell">
      <h1 style={{ textAlign: "center" }}>Diagnóstico de Segurança Física</h1>
      <p style={{ textAlign: "center" }}>Selecione o perfil de avaliação</p>
      <div className="profile-picker">
        <button type="button" onClick={() => navigate("/checklist/residencial/inspections")}>
          Residencial
        </button>
        <button type="button" onClick={() => navigate("/checklist/mpsc/inspections")}>
          MPSC
        </button>
      </div>
      {!name && (
        <p style={{ textAlign: "center", marginTop: "2rem" }}>
          <a href="/login">Fazer login</a> para criar e sincronizar inspeções.
        </p>
      )}
    </div>
  );
}
