import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { FC } from "react";
import { appQueryClient } from "@/config/query/query-client";
import { CACHE_PERSIST_OPTIONS, markInitialRestoreComplete } from "@/config/query/persister";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Restores the cached API data before any query runs, so the app renders from disk while offline.
 * Writes that were paused when the app last closed are resumed once the restore completes.
 */
const QueryProvider: FC<QueryProviderProps> = ({ children }) => (
  <PersistQueryClientProvider
    client={appQueryClient}
    persistOptions={CACHE_PERSIST_OPTIONS}
    onSuccess={() => {
      markInitialRestoreComplete();
      void appQueryClient.resumePausedMutations();
    }}
  >
    {children}
  </PersistQueryClientProvider>
);

export default QueryProvider;
