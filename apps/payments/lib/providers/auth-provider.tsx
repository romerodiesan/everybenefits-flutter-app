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
import { watchRolePermissions } from "@/lib/firebase/roles";
import {
  clearCachedProfile,
  readCachedProfile,
  writeCachedProfile,
} from "@/lib/profile-cache";
import type { UserProfile } from "@/lib/types";
import { resolveAccess, type RoleOrPermissions } from "@pulse/shared";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  /** Resolved permission keys for the current profile role. */
  permissions: string[];
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "permission-denied" || /permission-denied/i.test(String(error));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    initFirebaseClient();
    let unsubProfile: (() => void) | undefined;
    let generation = 0;

    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (next) => {
      unsubProfile?.();
      unsubProfile = undefined;
      const gen = ++generation;
      setUser(next);
      setLoading(false);

      if (!next) {
        setProfile(null);
        setPermissions([]);
        setProfileLoading(false);
        clearCachedProfile();
        return;
      }

      if (next.isAnonymous) {
        void getFirebaseAuth().signOut();
        return;
      }

      const uid = next.uid;
      const cached = readCachedProfile(uid);
      if (cached) setProfile(cached);
      setProfileLoading(!cached);

      void (async () => {
        try {
          const ensured = await ensureProfile(next);
          if (gen !== generation) return;
          if (getFirebaseAuth().currentUser?.uid !== uid) return;

          setProfile(ensured);
          writeCachedProfile(ensured);

          if (getFirebaseAuth().currentUser?.uid !== uid) return;
          unsubProfile = watchProfile(
            uid,
            (p) => {
              if (gen !== generation) return;
              if (getFirebaseAuth().currentUser?.uid !== uid) return;
              if (p) {
                setProfile(p);
                writeCachedProfile(p);
              }
            },
            (error) => {
              if (isPermissionDenied(error)) return;
              console.error(error);
            },
          );
        } catch (error) {
          if (gen !== generation) return;
          const message =
            error instanceof Error ? error.message : String(error);
          if (
            !/client is offline/i.test(message) &&
            !isPermissionDenied(error)
          ) {
            console.error(error);
          }
          if (!cached) setProfile(null);
        } finally {
          if (gen === generation) setProfileLoading(false);
        }
      })();
    });
    return () => {
      generation += 1;
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  useEffect(() => {
    if (!profile?.role) {
      setPermissions([]);
      return;
    }
    return watchRolePermissions(
      profile.role,
      setPermissions,
      (error) => {
        if (isPermissionDenied(error)) return;
        console.error(error);
      },
    );
  }, [profile?.role]);

  const refreshProfile = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    const ensured = await ensureProfile(current);
    if (getFirebaseAuth().currentUser?.uid !== current.uid) return;
    setProfile(ensured);
    writeCachedProfile(ensured);
  }, []);

  const value = useMemo(
    () => ({ user, profile, permissions, loading, profileLoading, refreshProfile }),
    [user, profile, permissions, loading, profileLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Live permissions when loaded, otherwise the profile role slug. */
export function useAccess(): RoleOrPermissions {
  const { permissions, profile } = useAuth();
  return useMemo(
    () => resolveAccess(permissions, profile?.role),
    [permissions, profile?.role],
  );
}
