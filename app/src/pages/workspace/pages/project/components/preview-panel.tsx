import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FC } from "react";
import { ArrowLeft, ArrowRight, Code2, Ellipsis, ExternalLink, Globe, Play, RotateCw, ScrollText, TriangleAlert, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Project, ProjectService } from "@/features/projects/interfaces/projects.interfaces";
import { ServiceKinds } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectProcesses, useStartService } from "@/features/processes/hooks/use-processes";
import { usePreviewActions, usePreviewState } from "@/features/preview/hooks/use-preview";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { useOverlayOpen } from "@/hooks/use-overlay-open";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_PREVIEW_PREFS, useWorkspaceStore } from "@/stores/workspace";
import { ProcessStatuses, type PreviewBounds } from "@shared/contract";
import { ServiceLogsSheet } from "../pages/overview/components/service-logs-sheet";
import { PreviewAddressInput } from "./preview-address-input";

interface PreviewPanelProps {
  project: Project;
  /** Review layout: the preview's dock group is maximized over the rest of the project area. */
  expanded?: boolean;
}

/**
 * Preview of a running localhost service, rendered by a native view that main positions over the body
 * placeholder. Lives in the project dock as a regular panel, so it can be dragged and split anywhere.
 */
export const PreviewPanel: FC<PreviewPanelProps> = ({ project }) => {
  const projectId = project.id;
  const prefs = useWorkspaceStore((s) => s.preview_by_project[projectId]) ?? DEFAULT_PREVIEW_PREFS;
  const setProjectPreview = useWorkspaceStore((s) => s.setProjectPreview);
  const processes = useProjectProcesses(projectId);
  const state = usePreviewState(projectId);
  const actions = usePreviewActions(projectId);
  const start = useStartService((command) => toast({ title: "Approval needed", description: `Start this service from the Overview tab to approve: ${command}`, duration: 6000 }));

  const [logsFor, setLogsFor] = useState<ProjectService | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const overlayOpen = useOverlayOpen(bodyRef);
  const lastBounds = useRef<PreviewBounds | null>(null);

  const services = useMemo(
    () =>
      project.services.map((service) => {
        const proc = processes[service.id];
        return { service, url: proc?.url ?? service.url, running: proc?.status === ProcessStatuses.RUNNING };
      }),
    [project.services, processes],
  );
  const runningWithUrl = services.filter((s) => s.running && s.url);
  const selected =
    services.find((s) => s.service.id === prefs.previewServiceId && s.url) ??
    runningWithUrl.find((s) => s.service.kind === ServiceKinds.FRONTEND) ??
    runningWithUrl[0] ??
    null;
  // A URL typed into the address bar wins over the previewed service's URL until the user picks another service.
  const override = prefs.previewUrl;
  const url = override ?? selected?.url ?? null;
  const stopped = !override && !!selected && !selected.running;
  const failed = !!state?.error;
  const visible = !!url && !overlayOpen && !failed;

  // Clipped to the ancestors that hide overflow. A squeezed dock group (full-width AI panel) keeps its
  // contents' size, so the raw rect can extend past what is on screen and the native view would overhang.
  const measure = useCallback((): PreviewBounds | null => {
    const el = bodyRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    let left = r.left;
    let top = r.top;
    let right = r.right;
    let bottom = r.bottom;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX === "visible" && style.overflowY === "visible") continue;
      const clip = node.getBoundingClientRect();
      left = Math.max(left, clip.left);
      top = Math.max(top, clip.top);
      right = Math.min(right, clip.right);
      bottom = Math.min(bottom, clip.bottom);
    }
    return { x: Math.round(left), y: Math.round(top), width: Math.round(Math.max(0, right - left)), height: Math.round(Math.max(0, bottom - top)) };
  }, []);

  // Show/hide the native view; `show` is idempotent for an unchanged URL.
  useLayoutEffect(() => {
    const bounds = measure();
    if (visible && url && bounds) {
      lastBounds.current = bounds;
      void actions.show(url, bounds);
    } else {
      void actions.hide();
    }
  }, [visible, url, actions, measure]);

  useEffect(() => () => void actions.hide(), [actions]);

  // Keep bounds in sync. Polled once per frame while visible: the panel can move without resizing
  // (e.g. another sidebar is dragged), which ResizeObserver and window resize events never report.
  // Only sends a message when the bounds actually changed.
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const sync = () => {
      const b = measure();
      const p = lastBounds.current;
      if (b && (!p || p.x !== b.x || p.y !== b.y || p.width !== b.width || p.height !== b.height)) {
        lastBounds.current = b;
        void actions.setBounds(b);
      }
      frame = requestAnimationFrame(sync);
    };
    frame = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frame);
  }, [visible, actions, measure]);

  const startFirst = () => {
    const target = services.find((s) => !s.running && s.service.kind === ServiceKinds.FRONTEND) ?? services.find((s) => !s.running);
    if (target) start.mutate({ projectId, service: target.service, siblings: project.services });
  };

  const displayUrl = state?.url || url || "";

  const navigateTo = (next: string) => {
    if (next === displayUrl) void actions.navigate("reload");
    else setProjectPreview(projectId, { previewUrl: next === selected?.url ? null : next });
  };

  return (
    <div className="relative flex h-full min-w-0 flex-col bg-background" aria-label="Preview">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
        {runningWithUrl.length > 1 && selected && (
          <Select value={selected.service.id} onValueChange={(id) => setProjectPreview(projectId, { previewServiceId: id, previewUrl: null })}>
            <SelectTrigger aria-label="Previewed service" className="h-7 w-auto max-w-[9rem] gap-1 px-2 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {runningWithUrl.map((s) => (
                <SelectItem key={s.service.id} value={s.service.id}>
                  {s.service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <HeaderButton label="Back" disabled={!state?.canGoBack} onClick={() => void actions.navigate("back")}>
          <ArrowLeft className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Forward" disabled={!state?.canGoForward} onClick={() => void actions.navigate("forward")}>
          <ArrowRight className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Reload" disabled={!url} onClick={() => void actions.navigate("reload")}>
          <RotateCw className="size-3.5" />
        </HeaderButton>
        {override && selected && (
          <HeaderButton label="Show service URL" onClick={() => setProjectPreview(projectId, { previewUrl: null })}>
            <Undo2 className="size-3.5" />
          </HeaderButton>
        )}
        <PreviewAddressInput currentUrl={displayUrl} onNavigate={navigateTo} />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" aria-label="More actions">
                      <Ellipsis className="size-3.5" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled={!displayUrl} onSelect={() => void openUrl(displayUrl)} className="gap-2">
              <ExternalLink className="size-3.5" /> Open in browser
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!url} onSelect={() => void actions.toggleDevTools()} className="gap-2">
              <Code2 className="size-3.5" /> Open DevTools
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!selected} onSelect={() => selected && setLogsFor(selected.service)} className="gap-2">
              <ScrollText className="size-3.5" /> View logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {stopped && (
        <div className="flex shrink-0 items-center gap-2 border-b bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="size-3.5" /> Service stopped
        </div>
      )}
      {state?.loading && <div className="h-0.5 w-full shrink-0 animate-pulse bg-foreground/40" />}
      <div ref={bodyRef} className="relative min-h-0 flex-1">
        {!url && (
          <EmptyState
            icon={<Globe />}
            title="No service with a URL is running"
            description="Start a service, or enter a localhost address above."
            action={
              services.some((s) => !s.running) && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={startFirst} loading={start.isPending}>
                  <Play className="size-3.5" /> Start service
                </Button>
              )
            }
          />
        )}
        {url && failed && (
          <EmptyState
            icon={<TriangleAlert />}
            title={`Can't reach ${displayUrl}`}
            description={`${state?.error ?? ""} The service may still be starting.`}
            action={
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void actions.navigate("reload")}>
                <RotateCw className="size-3.5" /> Retry
              </Button>
            }
          />
        )}
      </div>
      <ServiceLogsSheet project={project} service={logsFor} onClose={() => setLogsFor(null)} />
    </div>
  );
};

function HeaderButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" onClick={onClick} disabled={disabled} aria-label={label}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
