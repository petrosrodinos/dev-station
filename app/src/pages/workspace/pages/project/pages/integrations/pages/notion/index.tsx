import { useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, ExternalLink, FileText, Info, Pin, Search } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetNotionPage, useGetNotionPages, useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { useUpdateProject } from "@/features/projects/hooks/use-projects";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDialogsStore } from "@/stores/dialogs";
import { formatRelative } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { useProjectContext } from "../../../../hooks/use-project-context";

const MAX_CONTEXT_CHARS = 30_000;

/** Project documentation from Notion (Spec §18), usable as context for AI sessions. */
const NotionTab: FC = () => {
  const project = useProjectContext();
  const navigate = useNavigate();
  const { connections, isPending: connectionsPending } = useProviderConnections(IntegrationProviders.NOTION);
  const update = useUpdateProject();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 350);
  const [selectedId, setSelectedId] = useState<string | null>(project.notion_root_page_id);
  const connectionId = project.notion_connection_id;
  const { data: pages, isPending, isError, error } = useGetNotionPages(connectionId, debounced);
  const { data: page, isPending: pagePending } = useGetNotionPage(connectionId, selectedId);
  const openNewSession = useDialogsStore((s) => s.openNewSession);

  if (!connectionsPending && connections.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<FileText />}
        title="Notion isn't connected"
        description="Connect a Notion workspace in Integrations to give the team and AI agents access to project documentation."
        action={<Button onClick={() => navigate(Routes.workspace.integrations)}>Go to Integrations</Button>}
      />
    );
  }

  if (!connectionId) {
    return (
      <div className="p-4">
        <Panel className="max-w-xl p-4">
          <div className="mb-3 text-[0.8125rem] font-medium">Choose the Notion workspace for this project</div>
          <Select
            onValueChange={(v: string | null) => {
              if (v) update.mutate({ id: project.id, notion_connection_id: v });
            }}
            disabled={!can(PermissionKeys.PROJECTS_EDIT)}
          >
            <SelectTrigger aria-label="Notion account">
              <SelectValue placeholder="Choose a Notion account" />
            </SelectTrigger>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                  {c.external_account ? ` (${c.external_account})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Panel>
      </div>
    );
  }

  const startWithPageContext = () => {
    if (!page) return;
    const body = page.markdown.length > MAX_CONTEXT_CHARS ? `${page.markdown.slice(0, MAX_CONTEXT_CHARS)}\n\n[…truncated]` : page.markdown;
    openNewSession({
      project_id: project.id,
      initial_prompt: `Use this project documentation from Notion as context for the task below.\n\n# ${page.title}\n\n${body}\n\n---\nTask: `,
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2.5 rounded-lg border bg-card px-4 py-3 text-[0.7813rem] text-body">
        <Info className="size-4 shrink-0 text-muted-foreground" />
        Open a page and use it as context when starting a Claude Code or Cursor CLI session in this project.
      </div>
      <div className="grid grid-cols-1 items-start gap-4 @5xl:grid-cols-[1fr_1.3fr]">
        <Panel className="overflow-hidden">
          <PanelHeader title="Project documentation" actions={<Badge className="bg-info-soft text-info hover:bg-info-soft">AI-accessible</Badge>} />
          <div className="relative border-b">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Notion pages…" className="rounded-none border-0 pl-8 shadow-none focus-visible:ring-0" />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {isPending ? (
              <ListSkeleton rows={6} />
            ) : isError ? (
              <EmptyState title="Could not load Notion pages" description={error.message} />
            ) : !pages?.length ? (
              <EmptyState icon={<FileText />} title="No pages found" />
            ) : (
              pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn("flex w-full items-center gap-2 border-b border-hairline-soft px-3 py-2 text-left text-[0.8125rem] last:border-b-0 hover:bg-surface-elevated", selectedId === p.id && "bg-surface-card")}
                >
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{p.title || "Untitled"}</span>
                  {project.notion_root_page_id === p.id && <Pin className="size-3 text-info" />}
                  {p.last_edited_time && <span className="shrink-0 text-xs text-ash">{formatRelative(p.last_edited_time)}</span>}
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel className="min-w-0 overflow-hidden">
          {!selectedId ? (
            <EmptyState icon={<FileText />} title="Select a page to preview it" className="py-16" />
          ) : pagePending ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : page ? (
            <>
              <PanelHeader
                title={<span className="truncate">{page.title || "Untitled"}</span>}
                actions={
                  <>
                    {can(PermissionKeys.PROJECTS_EDIT) && project.notion_root_page_id !== page.id && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => update.mutate({ id: project.id, notion_root_page_id: page.id })}>
                        <Pin className="size-3.5" /> Pin to project
                      </Button>
                    )}
                    {page.url && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => void openUrl(page.url!)}>
                        <ExternalLink className="size-3.5" /> Notion
                      </Button>
                    )}
                    {can(PermissionKeys.AI_START_AGENTS) && (
                      <Button size="sm" className="h-7 gap-1 text-xs" onClick={startWithPageContext}>
                        <Bot className="size-3.5" /> Use as AI context
                      </Button>
                    )}
                  </>
                }
              />
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap p-4 text-[0.8125rem] leading-relaxed text-body">{page.markdown || <span className="text-ash">This page is empty.</span>}</div>
            </>
          ) : (
            <EmptyState title="Could not load the page" />
          )}
        </Panel>
      </div>
    </div>
  );
};

export default NotionTab;
