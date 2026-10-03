import { Plug } from "lucide-react";
import { CardGridSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useGetIntegrations } from "@/features/integrations/hooks/use-integrations";
import { IntegrationCard } from "./integration-card";
import { SettingsSectionHeader } from "./settings-row";

/** Integrations (Spec §14/§15): connect and manage accounts via Composio. */
export function IntegrationsSettings() {
  const { data, isPending, isError, error } = useGetIntegrations();
  return (
    <div>
      <SettingsSectionHeader
        title="Integrations"
        description="Connected accounts, permissions and connection management (via Composio)."
      />
      <div className="space-y-4">
        {isPending ? (
          <CardGridSkeleton cards={4} />
        ) : isError ? (
          <EmptyState
            icon={<Plug />}
            title="Could not load integrations"
            description={error.message}
          />
        ) : (
          <>
            {data?.some((i) => !i.available) && (
              <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-[0.7813rem] text-warning">
                Composio isn't configured on the server yet (set{" "}
                <span className="font-mono">COMPOSIO_API_KEY</span> in the API
                environment). Connections are unavailable until then.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
              {data?.map((integration) => (
                <IntegrationCard
                  key={integration.provider}
                  integration={integration}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
