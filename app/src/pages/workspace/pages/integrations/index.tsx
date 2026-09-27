import type { FC } from "react";
import { Plug } from "lucide-react";
import { CardGridSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useGetIntegrations } from "@/features/integrations/hooks/use-integrations";
import { IntegrationCard } from "./components/integration-card";

/** Central integrations area (Spec §14/§15): connect and manage accounts via Composio. */
const IntegrationsPage: FC = () => {
  const { data, isPending, isError, error } = useGetIntegrations();

  return (
    <div className="h-full overflow-y-auto">
      <IntegrationsContent data={data} isPending={isPending} error={isError ? error.message : null} />
    </div>
  );
};

export function IntegrationsContent({ data, isPending, error, embedded = false }: { data: ReturnType<typeof useGetIntegrations>["data"]; isPending: boolean; error: string | null; embedded?: boolean }) {
  return (
    <div className={embedded ? "space-y-4" : "space-y-4 p-6"}>
      {!embedded && (
        <div>
          <h1 className="text-lg font-medium">Integrations</h1>
          <p className="text-[13px] text-muted-foreground">Connect GitHub, Linear and Notion through Composio. Connect several accounts per service and choose which one each project uses.</p>
        </div>
      )}
      {isPending ? (
        <CardGridSkeleton cards={4} />
      ) : error ? (
        <EmptyState icon={<Plug />} title="Could not load integrations" description={error} />
      ) : (
        <>
          {data?.some((i) => !i.available) && (
            <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-[12.5px] text-warning">
              Composio isn't configured on the server yet (set <span className="font-mono">COMPOSIO_API_KEY</span> in the API environment). Connections are unavailable until then.
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data?.map((integration) => (
              <IntegrationCard key={integration.provider} integration={integration} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default IntegrationsPage;
