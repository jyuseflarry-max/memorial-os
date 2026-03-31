"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

export type AccessLevel = "none" | "view" | "edit" | "full";

const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

interface PermissionsContextValue {
  permissions: Record<string, AccessLevel>;
  loading: boolean;
  getLevel: (pageKey: string) => AccessLevel;
  canView: (pageKey: string) => boolean;
  canEdit: (pageKey: string) => boolean;
  canFull: (pageKey: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: {},
  loading: true,
  getLevel: () => "none",
  canView: () => false,
  canEdit: () => false,
  canFull: () => false,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { authUser, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authUser) {
      setPermissions({});
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/permissions/my");
      if (res.ok) {
        const data = await res.json();
        setPermissions(data as Record<string, AccessLevel>);
      }
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const getLevel = (pageKey: string): AccessLevel => permissions[pageKey] ?? "none";
  const canView  = (pageKey: string) => LEVEL_RANK[getLevel(pageKey)] >= LEVEL_RANK["view"];
  const canEdit  = (pageKey: string) => LEVEL_RANK[getLevel(pageKey)] >= LEVEL_RANK["edit"];
  const canFull  = (pageKey: string) => LEVEL_RANK[getLevel(pageKey)] >= LEVEL_RANK["full"];

  return (
    <PermissionsContext.Provider value={{ permissions, loading, getLevel, canView, canEdit, canFull }}>
      {children}
    </PermissionsContext.Provider>
  );
}
