import { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { ExternalLink, PanelRight, Pencil, Play, RotateCw, ScrollText, ShieldAlert, Square } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import type { Project, ProjectService } from "@/features/projects/interfaces/projects.interfaces";
import { describeServiceCommand } from "@/features/projects/utils/services.utils";
import { processKey, useApproveServiceCommand, useProjectProcesses, useRestartService, useStartService, useStopService } from "@/features/processes/hooks/use-processes";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { processStatusDot } from "@/lib/status";
import { formatRelative } from "@/lib/date";
import { getBridgeErrorCode, isDesktop } from "@/lib/desktop";
import { IpcErrorCodes, ProcessStatuses } from "@shared/contract";
import { ServiceLogsSheet } from "./service-logs-sheet";
import { ServicesEditorDialog } from "./services-editor-dialog";

interface PendingApproval {
  service: ProjectService;
  command: string;
  restart: boolean;
}

/** Development processes for the project (Spec §9): start/stop/restart, logs, open URL. */
export function ServicesCard({ project }: { project: Project }) {
  const processes = useProjectProcesses(project.id);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [logsFor, setLogsFor] = useState<ProjectService | null>(null);
  const [editing, setEditing] = useState(false);
  const approve = useApproveServiceCommand();
  const start = useStartService();
  const restart = useRestartService();
  const stop = useStopService();
  const { can } = usePermissions();
  const setProjectPreview = useWorkspaceStore((s) => s.setProjectPreview);

  const run = (service: ProjectService, isRestart = false) => {
    const onNeedsApproval = (command: string) => setPendingApproval({ service, command, restart: isRestart });
    const vars = { projectId: project.id, service };
    const handlers = {
      onError: (error: Error) => {
        if (getBridgeErrorCode(error) === IpcErrorCodes.COMMAND_NOT_APPROVED && service.command) onNeedsApproval(service.command);
      },
    };
    if (isRestart) restart.mutate(vars, handlers);
    else start.mutate(vars, handlers);
  };

  const confirmApproval = () => {
    if (!pendingApproval) return;
    const { service, command, restart: isRestart } = pendingApproval;
    approve.mutate(
      { projectId: project.id, command },
      {
        onSuccess: () => {
          setPendingApproval(null);
          run(service, isRestart);
        },
      },
    );
  };

  return (
    <Panel>
      <PanelHeader
        title={
          <>
            Services <span className="text-muted-foreground">({project.services.length})</span>
          </>
        }
        actions={
          can(PermissionKeys.PROJECTS_EDIT) && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          )
        }
      />
      <PanelBody className="py-1">
        {project.services.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-ash">No services detected — use Edit to detect or add them.</div>
        ) : (
          project.services.map((service) => {
            const proc = processes[service.id];
            const running = proc?.status === ProcessStatuses.RUNNING;
            const url = proc?.url ?? service.url;
            return (
              <div key={service.id} className="group flex items-center gap-2 border-b border-hairline-soft py-2 last:border-b-0">
                <StatusDot status={processStatusDot(proc?.status)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{service.name}</span>
                    {running && url && <span className="truncate font-mono text-xs text-muted-foreground">{url.replace(/^https?:\/\//, "")}</span>}
                    {proc?.status === ProcessStatuses.CRASHED && <span className="text-xs text-danger">crashed ({proc.exit_code})</span>}
                  </div>
                  <div className="truncate font-mono text-[11px] text-ash" title={describeServiceCommand(service)}>
                    {service.cwd !== "." ? `${service.cwd} · ` : ""}
                    {describeServiceCommand(service)}
                    {running && proc?.started_at ? ` · started ${formatRelative(proc.started_at)}` : ""}
                    {running && proc?.pid ? ` · pid ${proc.pid}` : ""}
                  </div>
                </div>
                {isDesktop() && (
                  <div className="flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                    {running && url && (
                      <IconAction label="Preview" onClick={() => setProjectPreview(project.id, { previewOpen: true, previewServiceId: service.id })}>
                        <PanelRight className="size-3.5" />
                      </IconAction>
                    )}
                    {running && url && (
                      <IconAction label="Open URL" onClick={() => void openUrl(url)}>
                        <ExternalLink className="size-3.5" />
                      </IconAction>
                    )}
                    <IconAction label="View logs" onClick={() => setLogsFor(service)}>
                      <ScrollText className="size-3.5" />
                    </IconAction>
                    {running ? (
                      <IconAction label="Stop" onClick={() => stop.mutate(processKey(project.id, service.id))}>
                        <Square className="size-3.5" />
                      </IconAction>
                    ) : (
                      <IconAction label="Start" onClick={() => run(service)}>
                        <Play className="size-3.5" />
                      </IconAction>
                    )}
                    <IconAction label="Restart" onClick={() => run(service, true)}>
                      <RotateCw className="size-3.5" />
                    </IconAction>
                  </div>
                )}
              </div>
            );
          })
        )}
      </PanelBody>

      <ServiceLogsSheet project={project} service={logsFor} onClose={() => setLogsFor(null)} />
      <ServicesEditorDialog project={project} open={editing} onOpenChange={setEditing} />
      <ConfirmationDialog
        isOpen={!!pendingApproval}
        onClose={() => setPendingApproval(null)}
        onConfirm={confirmApproval}
        title="Allow this command on this device?"
        description={`“${pendingApproval?.service.name}” runs a custom command defined for the project: ${pendingApproval?.command ?? ""} — only allow commands you trust. You won't be asked again for this exact command.`}
        confirmText="Allow & run"
        isLoading={approve.isPending}
        icon={<ShieldAlert className="size-5" />}
      />
    </Panel>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
