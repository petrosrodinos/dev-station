import { useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRefreshAccountToken } from "@/features/auth/hooks/use-auth";
import { isTokenExpired } from "@/lib/token";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The session is persisted asynchronously (OS keychain via Electron), so routing waits for rehydration.
 * Once hydrated, a stale session (missing/expired token) is cleared so routing sends the user to sign-in;
 * a valid one is refreshed so long-running desktop sessions stay valid.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);
  const { mutate: refresh } = useRefreshAccountToken();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!hydrated || !isLoggedIn || refreshed.current) return;
    const { access_token, expires_in } = useAuthStore.getState();
    if (!access_token || (expires_in && isTokenExpired(expires_in))) {
      logout();
      return;
    }
    refreshed.current = true;
    refresh();
  }, [hydrated, isLoggedIn, logout, refresh]);

  if (!hydrated) {
    return (
      <div className="flex h-full flex-col bg-canvas">
        <div className="h-12 border-b" />
        <div className="flex flex-1">
          <div className="flex w-16 flex-col items-center gap-2 border-r py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-10 rounded-full" />
            ))}
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
