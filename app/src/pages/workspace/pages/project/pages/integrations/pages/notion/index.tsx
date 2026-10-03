import { useCallback, useEffect, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Copy, ExternalLink, FileText, Info, MoreHorizontal, Pencil, Pin, PinOff, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useArchiveNotionPage, useGetNotionPage, useGetNotionPages, useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { useUpdateProject } from "@/features/projects/hooks/use-projects";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "@/hooks/use-toast";
import { useDialogsStore } from "@/stores/dialogs";
import { formatRelative } from "@/lib/date";
import { notionMarkdownToGfm } from "@/lib/notion-markdown";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { useProjectContext } from "../../../../hooks/use-project-context";
import { NewPageDialog } from "./components/new-page-dialog";
import { PageEditor } from "./components/page-editor";

const MAX_CONTEXT_CHARS = 30_000;

/** Project documentation from Notion (Spec §18), usable as context for AI sessions. */
const NotionTab: FC = () => {
  const project = useProjectContext();
  const navigate = useNavigate();
  const { connections, isPending: connectionsPending } = useProviderConnections(IntegrationProviders.NOTION);
  const update = useUpdateProject();
  const archive = useArchiveNotionPage();
  const { can } = usePermissions();
  const canEdit = can(PermissionKeys.PROJECTS_EDIT);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 350);
  const [selectedId, setSelectedId] = useState<string | null>(project.notion_root_page_id);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  // With a single connected workspace there's nothing to choose — use it directly and link it to the project.
  const soleConnectionId = connections.length === 1 ? connections[0].id : null;
  const connectionId = project.notion_connection_id ?? soleConnectionId;
  const { data: pages, isPending, isError, error, refetch: refetchPages, isFetching: pagesFetching } = useGetNotionPages(connectionId, debounced);
  const { data: page, isPending: pagePending, refetch: refetchPage, isFetching: pageFetching } = useGetNotionPage(connectionId, selectedId);
  const openNewSession = useDialogsStore((s) => s.openNewSession);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  useEffect(() => {
    if (!project.notion_connection_id && soleConnectionId && canEdit) update.mutate({ id: project.id, notion_connection_id: soleConnectionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- link once when the sole workspace becomes known
  }, [project.id, project.notion_connection_id, soleConnectionId, canEdit]);

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
            disabled={!canEdit}
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

  const isPinned = !!page && project.notion_root_page_id === page.id;

  const selectPage = (id: string) => {
    if (id === selectedId) return;
    if (editing && dirty) {
      setPendingSelectId(id);
      return;
    }
    setEditing(false);
    setDirty(false);
    setSelectedId(id);
  };

  const stopEditing = () => {
    setEditing(false);
    setDirty(false);
  };

  const startWithPageContext = () => {
    if (!page) return;
    const body = page.markdown.length > MAX_CONTEXT_CHARS ? `${page.markdown.slice(0, MAX_CONTEXT_CHARS)}\n\n[…truncated]` : page.markdown;
    openNewSession({
      project_id: project.id,
      initial_prompt: `Use this project documentation from Notion as context for the task below.\n\n# ${page.title}\n\n${body}\n\n---\nTask: `,
    });
  };

  const copyMarkdown = async () => {
    if (!page) return;
    await navigator.clipboard.writeText(page.markdown);
    toast({ title: "Markdown copied", duration: 1500 });
  };

  const archivePage = () => {
    if (!page) return;
    const wasPinned = isPinned;
    archive.mutate(
      { connectionId, pageId: page.id },
      {
        onSuccess: () => {
          setArchiveOpen(false);
          stopEditing();
          setSelectedId(null);
          if (wasPinned) update.mutate({ id: project.id, notion_root_page_id: null });
        },
      },
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2.5 rounded-lg border bg-card px-4 py-3 text-[0.7813rem] text-body">
        <Info className="size-4 shrink-0 text-muted-foreground" />
        Browse, write and edit project docs in Notion, then use a page as context when starting a Claude Code or Cursor CLI session in this project.
      </div>
      <div className="grid grid-cols-1 items-start gap-4 @5xl:grid-cols-[1fr_1.3fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Project documentation"
            actions={
              <>
                <Badge className="bg-info-soft text-info hover:bg-info-soft">AI-accessible</Badge>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Refresh pages" onClick={() => void refetchPages()}>
                        <RefreshCw className={cn("size-3.5", pagesFetching && "animate-spin")} />
                      </Button>
                    }
                  />
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setNewPageOpen(true)} disabled={!pages?.length}>
                    <Plus className="size-3.5" /> New page
                  </Button>
                )}
              </>
            }
          />
          <div className="relative border-b">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ash" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Notion pages…" className="rounded-none border-0 pl-8 shadow-none focus-visible:ring-0" />
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
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
                  onClick={() => selectPage(p.id)}
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
          ) : !page ? (
            <EmptyState title="Could not load the page" />
          ) : editing ? (
            <PageEditor key={page.id} connectionId={connectionId} page={page} onDirtyChange={onDirtyChange} onDone={stopEditing} />
          ) : (
            <>
              <PanelHeader
                title={
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate">{page.title || "Untitled"}</span>
                    {page.last_edited_time && <span className="shrink-0 text-xs font-normal text-ash">edited {formatRelative(page.last_edited_time)}</span>}
                  </span>
                }
                actions={
                  <>
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    )}
                    {can(PermissionKeys.AI_START_AGENTS) && (
                      <Button size="sm" className="h-7 gap-1 text-xs" onClick={startWithPageContext}>
                        <Bot className="size-3.5" /> Use as AI context
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="More page actions">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48">
                        {page.url && (
                          <DropdownMenuItem onSelect={() => void openUrl(page.url!)} className="gap-2">
                            <ExternalLink className="size-3.5" /> Open in Notion
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => void copyMarkdown()} className="gap-2">
                          <Copy className="size-3.5" /> Copy markdown
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void refetchPage()} className="gap-2">
                          <RefreshCw className={cn("size-3.5", pageFetching && "animate-spin")} /> Reload page
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            {isPinned ? (
                              <DropdownMenuItem onSelect={() => update.mutate({ id: project.id, notion_root_page_id: null })} className="gap-2">
                                <PinOff className="size-3.5" /> Unpin from project
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => update.mutate({ id: project.id, notion_root_page_id: page.id })} className="gap-2">
                                <Pin className="size-3.5" /> Pin to project
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem variant="destructive" onSelect={() => setArchiveOpen(true)} className="gap-2">
                              <Trash2 className="size-3.5" /> Move to trash
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                }
              />
              <div className="max-h-[65vh] overflow-y-auto p-4">
                {page.markdown.trim() ? <MarkdownPreview markdown={notionMarkdownToGfm(page.markdown)} /> : <span className="text-[0.8125rem] text-ash">This page is empty.</span>}
              </div>
            </>
          )}
        </Panel>
      </div>

      <NewPageDialog
        open={newPageOpen}
        onOpenChange={setNewPageOpen}
        connectionId={connectionId}
        parents={pages ?? []}
        defaultParentId={selectedId ?? project.notion_root_page_id}
        onCreated={(created) => {
          setSelectedId(created.id);
          setEditing(created.editable);
        }}
      />
      <ConfirmationDialog
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archivePage}
        title="Move page to trash?"
        description={`"${page?.title || "Untitled"}" will be moved to the Notion trash. You can restore it from Notion.`}
        confirmText="Move to trash"
        variant="destructive"
        isLoading={archive.isPending}
      />
      <ConfirmationDialog
        isOpen={!!pendingSelectId}
        onClose={() => setPendingSelectId(null)}
        onConfirm={() => {
          stopEditing();
          setSelectedId(pendingSelectId);
          setPendingSelectId(null);
        }}
        title="Discard unsaved changes?"
        description="Your edits to this page haven't been saved to Notion."
        confirmText="Discard"
        variant="destructive"
      />
    </div>
  );
};

export default NotionTab;
