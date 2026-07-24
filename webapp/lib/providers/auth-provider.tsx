"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { initFirebaseClient, getFirebaseAuth } from "@/lib/firebase/client";
import {
  ensureProfile,
  watchProfile,
} from "@/lib/firebase/users";
import { ensureDefaultAgentGroup } from "@/lib/firebase/ensure-default-group";
import { belongsInDefaultAgentGroup } from "@/lib/roles";
import type { UserProfile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initFirebaseClient();
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), async (next) => {
      unsubProfile?.();
      unsubProfile = undefined;
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const ensured = await ensureProfile(next);
        setProfile(ensured);
        if (
          belongsInDefaultAgentGroup(ensured.role) &&
          !ensured.isAnonymous
        ) {
          ensureDefaultAgentGroup().catch(() => undefined);
        }
        unsubProfile = watchProfile(
          next.uid,
          (p) => {
            if (p) setProfile(p);
          },
          (error) => {
            console.error(error);
          },
        );
      } catch (error) {
        console.error(error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    const ensured = await ensureProfile(current);
    setProfile(ensured);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile }),
    [user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
