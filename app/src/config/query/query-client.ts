import { MutationCache, QueryCache, QueryClient, onlineManager } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { initConnectivity } from "@/config/query/connectivity";
import { CACHE_MAX_AGE_MS, CACHED_QUERY_ROOTS } from "@/config/query/offline-policy";
import { attachCacheSession } from "@/config/query/persister";
import { registerMutationDefaults } from "@/config/query/mutation-defaults";

let queuedNoticeShown = false;

// One "saved offline" notice per offline period. The banner carries the ongoing state.
onlineManager.subscribe((online) => {
    if (online) queuedNoticeShown = false;
});

const announceQueuedWrite = () => {
    if (queuedNoticeShown) return;
    queuedNoticeShown = true;
    toast({
        title: "Saved offline",
        description: "This change will sync when the connection is back.",
        variant: "warning",
        duration: 4000,
    });
};

const createAppQueryClient = (): QueryClient => {
    initConnectivity();

    const queryClient = new QueryClient({
        queryCache: new QueryCache(),
        mutationCache: new MutationCache({
            onMutate: (_variables, mutation) => {
                if (mutation.options.networkMode === "online" && !onlineManager.isOnline()) announceQueuedWrite();
            },
        }),
        defaultOptions: {
            // Local IPC work never talks to the API and must keep running offline, so "always" is the default.
            queries: { networkMode: "always", refetchOnWindowFocus: false },
            mutations: { networkMode: "always", retry: false },
        },
    });

    for (const root of CACHED_QUERY_ROOTS) {
        queryClient.setQueryDefaults([root], { networkMode: "online", gcTime: CACHE_MAX_AGE_MS });
    }

    registerMutationDefaults(queryClient);
    attachCacheSession(queryClient);
    return queryClient;
};

/**
 * One client for the whole app. Created at module scope so React StrictMode's double-invoked initializers
 * can't leave a second client subscribed to the auth store and the persister.
 */
export const appQueryClient = createAppQueryClient();
