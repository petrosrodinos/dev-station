import type { QueryClient } from "@tanstack/react-query";
import {
    persistQueryClientRestore,
    persistQueryClientSave,
    type PersistedClient,
    type Persister,
    type PersistQueryClientOptions,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { useAuthStore, getAuthStoreState } from "@/stores/auth";
import { CACHE_BUSTER, CACHE_MAX_AGE_MS, isCachedQuery } from "@/config/query/offline-policy";

const STORAGE_PREFIX = "query-cache:";
const keyFor = (userId: string) => `${STORAGE_PREFIX}${userId}`;

/**
 * The user the cache belongs to. It survives sign-out on purpose: the final save of an expired session
 * must land in that user's slot, not in a slot for nobody.
 */
let cacheOwner: string | null = null;
/** Only true during a signed-in session, so clearing memory on sign-out can never wipe the saved copy. */
let writesEnabled = false;
let initialRestoreComplete = false;
/** Set by an explicit sign-out with nothing left to sync: the saved copy is deleted instead of kept. */
let discardOnSignOut = false;
/** Bumped on every sign-in, so a slow sign-out save can't switch writes off for a newer session. */
let sessionVersion = 0;

const waitForAuthHydrated = () =>
    new Promise<void>((resolve) => {
        if (useAuthStore.getState().hydrated) return resolve();
        const unsubscribe = useAuthStore.subscribe((state) => {
            if (!state.hydrated) return;
            unsubscribe();
            resolve();
        });
    });

/** One IndexedDB entry per user: the query snapshot plus any writes still waiting to sync. */
export const cachePersister: Persister = {
    persistClient: async (client: PersistedClient) => {
        if (!writesEnabled || !cacheOwner) return;
        try {
            await set(keyFor(cacheOwner), client);
        } catch {
            // Quota or a blocked store: keep working in memory rather than failing the app.
        }
    },
    restoreClient: async () => {
        await waitForAuthHydrated();
        const userId = getAuthStoreState().user_uuid;
        if (!userId) return undefined;
        cacheOwner = userId;
        writesEnabled = true;
        try {
            return await get<PersistedClient>(keyFor(userId));
        } catch {
            return undefined;
        }
    },
    removeClient: async () => {
        if (!cacheOwner) return;
        try {
            await del(keyFor(cacheOwner));
        } catch {
            // Nothing to remove if the store is unavailable.
        }
    },
};

/** Options shared by the provider's restore/subscribe and the explicit save on sign-out. */
export const CACHE_PERSIST_OPTIONS = {
    persister: cachePersister,
    buster: CACHE_BUSTER,
    maxAge: CACHE_MAX_AGE_MS,
    dehydrateOptions: {
        shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
            query.state.status === "success" && isCachedQuery(query.queryKey),
    },
} satisfies Omit<PersistQueryClientOptions, "queryClient">;

/** Called once the provider has finished its first restore, so later sign-ins restore on their own. */
export const markInitialRestoreComplete = () => {
    initialRestoreComplete = true;
};

/** Explicit sign-out with no unsynced writes: the saved copy is deleted rather than kept. */
export const discardCacheOnSignOut = () => {
    discardOnSignOut = true;
};

const restoreSessionCache = async (queryClient: QueryClient) => {
    await persistQueryClientRestore({ queryClient, ...CACHE_PERSIST_OPTIONS });
    await queryClient.resumePausedMutations();
};

const beginSession = (userId: string, queryClient: QueryClient) => {
    sessionVersion += 1;
    cacheOwner = userId;
    writesEnabled = true;
    // The provider restores on first mount. Later sign-ins (after it has mounted) restore here.
    if (initialRestoreComplete) void restoreSessionCache(queryClient);
};

const endSession = async (queryClient: QueryClient) => {
    const version = sessionVersion;
    try {
        if (discardOnSignOut) {
            discardOnSignOut = false;
            // Stop writes first, so a cache change during the delete can't save this user's data back.
            writesEnabled = false;
            await cachePersister.removeClient();
        } else {
            // Writes stay on until this save lands; nothing is cleared before then, so the snapshot is complete.
            await persistQueryClientSave({ queryClient, ...CACHE_PERSIST_OPTIONS });
        }
    } finally {
        if (version === sessionVersion) {
            writesEnabled = false;
            queryClient.clear();
        }
    }
};

/** Follows sign-in and sign-out (including token-expiry logouts) so memory never outlives the session. */
export const attachCacheSession = (queryClient: QueryClient) => {
    const current = getAuthStoreState();
    if (current.isLoggedIn && current.user_uuid) beginSession(current.user_uuid, queryClient);

    return useAuthStore.subscribe((state, prev) => {
        const wasSignedIn = prev.isLoggedIn && !!prev.user_uuid;
        const isSignedIn = state.isLoggedIn && !!state.user_uuid;
        if (wasSignedIn && (!isSignedIn || prev.user_uuid !== state.user_uuid)) void endSession(queryClient);
        if (isSignedIn && (!wasSignedIn || prev.user_uuid !== state.user_uuid)) beginSession(state.user_uuid!, queryClient);
    });
};
