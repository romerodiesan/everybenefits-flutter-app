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
import { ensureProfile, watchProfile } from "@/lib/firebase/users";
import { ensureDefaultAgentGroup } from "@/lib/firebase/ensure-default-group";
import { belongsInDefaultAgentGroup } from "@/lib/roles";
import {
  clearCachedProfile,
  readCachedProfile,
  writeCachedProfile,
} from "@/lib/profile-cache";
import type { UserProfile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  /** True until the first auth state is known. */
  loading: boolean;
  /** True while Firestore profile is still resolving (cache may already show). */
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    initFirebaseClient();
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (next) => {
      unsubProfile?.();
      unsubProfile = undefined;
      setUser(next);
      setLoading(false);

      if (!next) {
        setProfile(null);
        setProfileLoading(false);
        clearCachedProfile();
        return;
      }

      const cached = readCachedProfile(next.uid);
      if (cached) setProfile(cached);
      setProfileLoading(!cached);

      void (async () => {
        try {
          const ensured = await ensureProfile(next);
          setProfile(ensured);
          writeCachedProfile(ensured);
          if (
            belongsInDefaultAgentGroup(ensured.role) &&
            !ensured.isAnonymous
          ) {
            ensureDefaultAgentGroup().catch(() => undefined);
          }
          unsubProfile = watchProfile(
            next.uid,
            (p) => {
              if (p) {
                setProfile(p);
                writeCachedProfile(p);
              }
            },
            (error) => console.error(error),
          );
        } catch (error) {
          console.error(error);
          if (!cached) setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      })();
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
    writeCachedProfile(ensured);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, profileLoading, refreshProfile }),
    [user, profile, loading, profileLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
