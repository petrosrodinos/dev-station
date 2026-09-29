import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight, Code2, ExternalLink, Globe, Maximize2, Minimize2, Play, RotateCw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { ServiceKinds } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectProcesses, useStartService } from "@/features/processes/hooks/use-processes";
import { usePreviewActions, usePreviewState } from "@/features/preview/hooks/use-preview";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { useOverlayOpen } from "@/hooks/use-overlay-open";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_PREVIEW_PREFS, useWorkspaceStore } from "@/stores/workspace";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { formatComboParts } from "@/lib/shortcuts.utils";
import { cn } from "@/lib/utils";
import { ProcessStatuses, type PreviewBounds } from "@shared/contract";

const MIN_WIDTH = 280;
const MAX_WIDTH_RATIO = 0.75;

interface PreviewPanelProps {
  project: Project;
  /** Review layout: fill the project area instead of docking at a fixed width. */
  expanded?: boolean;
}

/** Docked preview of a running localhost service, rendered by a native view that main positions over the body placeholder. */
export const PreviewPanel: FC<PreviewPanelProps> = ({ project, expanded = false }) => {
  const projectId = project.id;
  const prefs = useWorkspaceStore((s) => s.preview_by_project[projectId]) ?? DEFAULT_PREVIEW_PREFS;
  const setProjectPreview = useWorkspaceStore((s) => s.setProjectPreview);
  const processes = useProjectProcesses(projectId);
  const state = usePreviewState(projectId);
  const actions = usePreviewActions(projectId);
  const overlayOpen = useOverlayOpen();
  const start = useStartService((command) => toast({ title: "Approval needed", description: `Start this service from the Overview tab to approve: ${command}`, duration: 6000 }));

  const bodyRef = useRef<HTMLDivElement>(null);
  const lastBounds = useRef<PreviewBounds | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const dragging = dragWidth !== null;

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
  const url = selected?.url ?? null;
  const stopped = !!selected && !selected.running;
  const failed = !!state?.error;
  const visible = !!url && !overlayOpen && !dragging && !failed;

  const measure = useCallback((): PreviewBounds | null => {
    const el = bodyRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
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

  const clampWidth = (w: number) => Math.round(Math.max(MIN_WIDTH, Math.min(w, window.innerWidth * MAX_WIDTH_RATIO)));

  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = prefs.previewWidth;
    let latest = startWidth;
    const move = (ev: PointerEvent) => {
      latest = clampWidth(startWidth + (startX - ev.clientX));
      setDragWidth(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setProjectPreview(projectId, { previewWidth: latest });
      setDragWidth(null);
    };
    setDragWidth(startWidth);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startFirst = () => {
    const target = services.find((s) => !s.running && s.service.kind === ServiceKinds.FRONTEND) ?? services.find((s) => !s.running);
    if (target) start.mutate({ projectId, service: target.service, siblings: project.services });
  };

  const close = () => setProjectPreview(projectId, { previewOpen: false, previewExpanded: false });
  const layoutCombo = useResolvedShortcuts().find((s) => s.id === ShortcutActions.TOGGLE_REVIEW_LAYOUT)?.combo;
  const layoutHint = layoutCombo ? ` (${formatComboParts(layoutCombo).join("+")})` : "";
  const displayUrl = state?.url || url || "";

  return (
    <aside
      className={cn("relative flex flex-col bg-background", expanded ? "min-w-0 flex-1 border-t" : "shrink-0 border-l")}
      style={expanded ? undefined : { width: dragWidth ?? prefs.previewWidth }}
      aria-label="Preview"
    >
      {!expanded && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize preview"
          onPointerDown={onDragStart}
          className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-hairline-strong/40"
        />
      )}
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
        {runningWithUrl.length > 1 && selected && (
          <Select value={selected.service.id} onValueChange={(id) => setProjectPreview(projectId, { previewServiceId: id })}>
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
        <div className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-muted-foreground" title={displayUrl}>
          {displayUrl.replace(/^https?:\/\//, "")}
        </div>
        <HeaderButton label="Open in browser" disabled={!displayUrl} onClick={() => void openUrl(displayUrl)}>
          <ExternalLink className="size-3.5" />
        </HeaderButton>
        <HeaderButton label="Open DevTools (Network, Console, ...)" disabled={!url} onClick={() => void actions.toggleDevTools()}>
          <Code2 className="size-3.5" />
        </HeaderButton>
        <HeaderButton
          label={expanded ? `Restore project view${layoutHint}` : `Review layout — preview beside the session${layoutHint}`}
          onClick={() => setProjectPreview(projectId, { previewExpanded: !expanded })}
        >
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </HeaderButton>
        <HeaderButton label="Close preview" onClick={close}>
          <X className="size-3.5" />
        </HeaderButton>
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
            description="Start a service to preview it here."
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
    </aside>
  );
};

function HeaderButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
