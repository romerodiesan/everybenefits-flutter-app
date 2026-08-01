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
import { initFirebaseClient, getFirebaseAuth } from "@pulse/firebase-client";
import { ensureProfile, watchProfile } from "@/lib/firebase/users";
import {
  clearCachedProfile,
  readCachedProfile,
  writeCachedProfile,
} from "@/lib/profile-cache";
import type { UserProfile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
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
        setProfileLoading(false);
        clearCachedProfile();
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

  const refreshProfile = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    const ensured = await ensureProfile(current);
    if (getFirebaseAuth().currentUser?.uid !== current.uid) return;
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
