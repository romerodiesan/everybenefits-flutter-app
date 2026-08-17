"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { initFirebaseClient, getFirebaseAuth } from "@/lib/firebase/client";
import { ensureProfile, watchProfile } from "@/lib/firebase/users";
import { watchRolePermissions } from "@/lib/firebase/roles";
import { ensureDefaultAgentGroup } from "@/lib/firebase/ensure-default-group";
import { belongsInDefaultAgentGroup } from "@/lib/roles";
import { resolveAccess } from "@pulse/shared";
import {
  clearCachedProfile,
  hasTrustedShellCache,
  readCachedProfile,
  writeCachedProfile,
} from "@/lib/profile-cache";
import { isFirebasePermissionDenied } from "@/lib/firebase/permission-error";
import type { UserProfile } from "@/lib/types";
import type { RoleOrPermissions } from "@pulse/shared";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  /** Resolved permission keys for the current profile role. */
  permissions: string[];
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const ensuredDefaultGroupForUid = useRef<string | null>(null);

  useEffect(() => {
    initFirebaseClient();
    void import("@/lib/privacy/telemetry").then(({ hydrateTelemetry }) => {
      void hydrateTelemetry();
    });
    let unsubProfile: (() => void) | undefined;
    let generation = 0;

    const unsubAuth = onAuthStateChanged(getFirebaseAuth(), (next) => {
      unsubProfile?.();
      unsubProfile = undefined;
      const gen = ++generation;
      setUser(next);
      setLoading(false);

      if (!next) {
        ensuredDefaultGroupForUid.current = null;
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
      if (ensuredDefaultGroupForUid.current !== uid) {
        ensuredDefaultGroupForUid.current = null;
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
              // Race: listener attached just as session switched away from uid.
              if (isFirebasePermissionDenied(error)) return;
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
            !isFirebasePermissionDenied(error)
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
        if (isFirebasePermissionDenied(error)) return;
        console.error(error);
      },
    );
  }, [profile?.role]);

  useEffect(() => {
    if (!profile) return;
    if (ensuredDefaultGroupForUid.current === profile.uid) return;
    const access = resolveAccess(permissions, profile.role);
    if (!belongsInDefaultAgentGroup(access) || profile.isAnonymous) return;
    ensuredDefaultGroupForUid.current = profile.uid;
    ensureDefaultAgentGroup().catch(() => undefined);
  }, [profile, permissions]);

  const refreshProfile = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    const ensured = await ensureProfile(current);
    if (getFirebaseAuth().currentUser?.uid !== current.uid) return;
    setProfile(ensured);
    writeCachedProfile(ensured);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      permissions,
      loading,
      profileLoading,
      refreshProfile,
    }),
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
