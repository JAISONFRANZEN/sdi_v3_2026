import React, { createContext, useContext, useMemo, useState } from "react";

export type Role = "admin" | "inspetor_mpsc" | "usuario_residencial";

interface AuthState {
  token: string | null;
  name: string | null;
  role: Role | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, name: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadInitialState(): AuthState {
  return {
    token: localStorage.getItem("auth_token"),
    name: localStorage.getItem("auth_name"),
    role: (localStorage.getItem("auth_role") as Role | null) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: (token, name, role) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_name", name);
        localStorage.setItem("auth_role", role);
        setState({ token, name, role });
      },
      logout: () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_name");
        localStorage.removeItem("auth_role");
        setState({ token: null, name: null, role: null });
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
