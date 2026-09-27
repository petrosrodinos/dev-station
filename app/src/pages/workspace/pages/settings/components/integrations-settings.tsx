import { useGetIntegrations } from "@/features/integrations/hooks/use-integrations";
import { IntegrationsContent } from "@/pages/workspace/pages/integrations";
import { SettingsSectionHeader } from "./settings-row";

export function IntegrationsSettings() {
  const { data, isPending, isError, error } = useGetIntegrations();
  return (
    <div>
      <SettingsSectionHeader title="Integrations" description="Connected accounts, permissions and connection management (via Composio)." />
      <IntegrationsContent data={data} isPending={isPending} error={isError ? error.message : null} embedded />
    </div>
  );
}
