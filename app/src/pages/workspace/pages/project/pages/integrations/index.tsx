import type { FC } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, ListChecks } from "lucide-react";
import { ProjectIntegrationOptions, ProjectIntegrations, type ProjectIntegration } from "@/config/constants/dropdowns/projects/project-integration.options";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LinearTab from "./pages/linear";
import NotionTab from "./pages/notion";

const INTEGRATION_ICONS: Record<ProjectIntegration, typeof ListChecks> = {
  [ProjectIntegrations.LINEAR]: ListChecks,
  [ProjectIntegrations.NOTION]: FileText,
};

const INTEGRATION_PAGES: Record<ProjectIntegration, FC> = {
  [ProjectIntegrations.LINEAR]: LinearTab,
  [ProjectIntegrations.NOTION]: NotionTab,
};

/** Project integrations: a tab bar switches between providers (the selection lives in `?integration=`). */
const IntegrationsTab: FC = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get("integration");
  const active = ProjectIntegrationOptions.find((o) => o.id === requested)?.id ?? ProjectIntegrations.LINEAR;
  const Page = INTEGRATION_PAGES[active];

  return (
    <Tabs value={active} onValueChange={(value) => setParams({ integration: value as ProjectIntegration }, { replace: true })} className="min-h-full gap-0">
      <div className="shrink-0 overflow-x-auto border-b px-3">
        <TabsList variant="line" aria-label="Integrations" className="h-10">
          {ProjectIntegrationOptions.map((option) => {
            const Icon = INTEGRATION_ICONS[option.id];
            return (
              <TabsTrigger key={option.id} value={option.id} className="flex-none px-2.5 text-[0.8125rem]">
                <Icon className="size-3.5" /> {option.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      <div className="min-w-0 flex-1">
        <Page />
      </div>
    </Tabs>
  );
};

export default IntegrationsTab;
