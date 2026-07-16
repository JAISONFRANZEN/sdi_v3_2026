import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAuth } from "../lib/authContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginMutation = trpc.auth.login.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      login(result.token, result.name, result.role);
      navigate("/");
    } catch (err) {
      setError(navigator.onLine ? "Credenciais inválidas." : "Sem conexão para autenticar.");
    }
  }

  return (
    <div className="app-shell">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 320 }}>
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loginMutation.isLoading}>
          {loginMutation.isLoading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
