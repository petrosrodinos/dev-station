import { useGetIntegrations } from "./use-integrations";

/** Human label for a connection id (e.g. "Company GitHub (acme-bot)"), or null. */
export const useIntegrationConnectionLabel = (connectionId: string | null | undefined): string | null => {
    const { data } = useGetIntegrations();
    if (!connectionId) return null;
    for (const integration of data ?? []) {
        const c = integration.connections.find((x) => x.id === connectionId);
        if (c) return c.external_account ? `${c.label} (${c.external_account})` : c.label;
    }
    return null;
};
