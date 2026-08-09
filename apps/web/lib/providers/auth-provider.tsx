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
  hasTrustedShellCache,
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
    void import("@/lib/privacy/telemetry").then(({ hydrateTelemetry }) => {
      void hydrateTelemetry();
    });
    let unsubProfile: (() => void) | undefined;
    let generation = 0;
    /** Once per uid — avoid re-firing on every profile snapshot. */
    let ensuredDefaultGroupForUid: string | null = null;

    const maybeEnsureDefaultAgentGroup = (p: UserProfile) => {
      if (ensuredDefaultGroupForUid === p.uid) return;
      if (!belongsInDefaultAgentGroup(p.role) || p.isAnonymous) return;
      ensuredDefaultGroupForUid = p.uid;
      ensureDefaultAgentGroup().catch(() => undefined);
    };

    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (next) => {
      unsubProfile?.();
      unsubProfile = undefined;
      const gen = ++generation;
      setUser(next);
      setLoading(false);

      if (!next) {
        ensuredDefaultGroupForUid = null;
        setProfile(null);
        setProfileLoading(false);
        clearCachedProfile();
        return;
      }

      const uid = next.uid;
      if (ensuredDefaultGroupForUid !== uid) {
        ensuredDefaultGroupForUid = null;
      }
      const cached = readCachedProfile(uid);
      if (cached) setProfile(cached);
      // Trusted approved cache paints immediately; gates still wait when untrusted.
      setProfileLoading(!hasTrustedShellCache(uid));

      void (async () => {
        try {
          const ensured = await ensureProfile(next);
          // Auth switched while ensureProfile was in flight — drop stale work.
          if (gen !== generation) return;
          if (getFirebaseAuth().currentUser?.uid !== uid) return;

          setProfile(ensured);
          writeCachedProfile(ensured);
          maybeEnsureDefaultAgentGroup(ensured);

          if (getFirebaseAuth().currentUser?.uid !== uid) return;
          unsubProfile = watchProfile(
            uid,
            (p) => {
              if (gen !== generation) return;
              if (getFirebaseAuth().currentUser?.uid !== uid) return;
              if (p) {
                setProfile(p);
                writeCachedProfile(p);
                maybeEnsureDefaultAgentGroup(p);
              }
            },
            (error) => {
              // Race: listener attached just as session switched away from uid.
              if (isPermissionDenied(error)) return;
              console.error(error);
            },
          );
        } catch (error) {
          if (gen !== generation) return;
          const message =
            error instanceof Error ? error.message : String(error);
          // Emulator/CSP offline noise — keep cache if we have it.
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
