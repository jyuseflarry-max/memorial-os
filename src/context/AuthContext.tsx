"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "Admin" | "Coach" | "Manager" | "Player";

export interface AuthUser {
  id:       string;
  email:    string | null;
  fullName: string | null;
  role:     UserRole;
  tenantId: string;
  /** The player's team — only populated for role=Player */
  teamId:   string | null;
  /** The player's own record id — only populated for role=Player */
  playerId: string | null;
}

interface AuthContextValue {
  authUser:  AuthUser | null;
  loading:   boolean;
  refresh:   () => Promise<void>;
  isAdmin:   boolean;
  isCoach:   boolean;
  isManager: boolean;
  isPlayer:  boolean;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  authUser:  null,
  loading:   true,
  refresh:   async () => {},
  isAdmin:   false,
  isCoach:   false,
  isManager: false,
  isPlayer:  false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading,  setLoading]  = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { setAuthUser(null); return; }
      const data = await res.json();
      setAuthUser(data);
    } catch {
      setAuthUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const role = authUser?.role;

  return (
    <AuthContext.Provider value={{
      authUser,
      loading,
      refresh,
      isAdmin:   role === "Admin",
      isCoach:   role === "Coach",
      isManager: role === "Manager",
      isPlayer:  role === "Player",
    }}>
      {children}
    </AuthContext.Provider>
  );
}
