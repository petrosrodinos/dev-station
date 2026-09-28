import type { FC } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, ListChecks } from "lucide-react";
import { ProjectIntegrationOptions, ProjectIntegrations, type ProjectIntegration } from "@/config/constants/dropdowns/projects/project-integration.options";
import { cn } from "@/lib/utils";
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

/** Project integrations: left menu switches between providers (the selection lives in `?integration=`). */
const IntegrationsTab: FC = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get("integration");
  const active = ProjectIntegrationOptions.find((o) => o.id === requested)?.id ?? ProjectIntegrations.LINEAR;
  const Page = INTEGRATION_PAGES[active];

  return (
    <div className="flex min-h-full">
      <nav className="w-48 shrink-0 space-y-0.5 border-r p-2" aria-label="Integrations">
        {ProjectIntegrationOptions.map((option) => {
          const Icon = INTEGRATION_ICONS[option.id];
          return (
            <button
              key={option.id}
              onClick={() => setParams({ integration: option.id }, { replace: true })}
              aria-current={active === option.id ? "page" : undefined}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[0.8125rem] font-medium text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                active === option.id && "bg-surface-elevated text-foreground",
              )}
            >
              <Icon className="size-3.5" /> {option.label}
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <Page />
      </div>
    </div>
  );
};

export default IntegrationsTab;
