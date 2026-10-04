import { onlineManager } from "@tanstack/react-query";

/** Bump when a cached response shape changes, so stale snapshots are dropped instead of hydrated. */
export const CACHE_BUSTER = "dev-station-query-cache-1";

/** Snapshots older than this are discarded on restore. Paused writes expire with them. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Query-key roots backed by the remote API. These are persisted to disk, read from cache while offline,
 * and never fetched without a connection. Local IPC roots (git, files, processes, ...) are not listed here.
 */
export const CACHED_QUERY_ROOTS = [
    "projects",
    "project-issues",
    "activities",
    "me",
    "preferences",
    "organizations",
    "roles",
    "members",
    "invitations",
    "permission-catalog",
    "integrations",
    "linear-teams",
    "linear-projects",
    "linear-team-states",
    "linear-team-members",
    "linear-issues",
    "linear-issue",
    "notion-pages",
    "notion-page",
    "github-repositories",
    "agent-commands",
    "git-identities",
    "custom-skills",
    "skill-favorites",
    "workspace-layouts",
    "workspace-layout-state",
    "agent-sessions",
    "agent-catalog",
] as const;

export const isCachedQuery = (queryKey: readonly unknown[]): boolean => (CACHED_QUERY_ROOTS as readonly unknown[]).includes(queryKey[0]);

/**
 * Outbox policy for API writes. While offline the mutation pauses instead of failing, and it is persisted
 * with its variables. Network failures during the call keep it paused rather than dropping it.
 * Register it per mutation key via `setMutationDefaults`, and give each domain a `scope` so its writes
 * replay in the order they were made.
 *
 * The retry decision reads connectivity, not the error: the service layer rethrows a plain Error (the
 * Axios error is gone by then), and the Axios interceptor has already marked the app offline by the time
 * the error arrives. So "offline now" means "this failed because the network dropped", and the write parks.
 */
export const QUEUED_MUTATION_POLICY = {
    networkMode: "online",
    retry: () => !onlineManager.isOnline(),
} as const;
