import { useState } from "react";
import { Zap } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useKillPorts } from "@/features/processes/hooks/use-processes";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";

const storageKey = (projectId: string) => `dev-station:ports:${projectId}`;

const readSaved = (projectId: string) => {
  try {
    return localStorage.getItem(storageKey(projectId)) ?? "";
  } catch {
    return "";
  }
};

/** Parses "3000, 5173" into unique valid ports; `invalid` lists the entries that are not ports. */
const parsePorts = (raw: string) => {
  const entries = raw.split(",").map((e) => e.trim()).filter(Boolean);
  const ports: number[] = [];
  const invalid: string[] = [];
  for (const e of entries) {
    const n = Number(e);
    if (/^\d+$/.test(e) && n >= 1 && n <= 65535) {
      if (!ports.includes(n)) ports.push(n);
    } else invalid.push(e);
  }
  return { ports, invalid };
};

/** Frees a set of ports by terminating whatever is listening on them. Desktop only. */
export function PortsCard({ projectId }: { projectId: string }) {
  const [value, setValue] = useState(() => readSaved(projectId));
  const [confirming, setConfirming] = useState(false);
  const kill = useKillPorts();
  const { can } = usePermissions();
  const { ports, invalid } = parsePorts(value);
  const canRun = ports.length > 0 && invalid.length === 0 && ports.length <= 30;

  const change = (next: string) => {
    setValue(next);
    try {
      localStorage.setItem(storageKey(projectId), next);
    } catch {
      /* storage unavailable: the value just isn't remembered */
    }
  };

  return (
    <Panel>
      <PanelHeader title="Free ports" />
      <PanelBody className="space-y-2.5 py-3">
        <p className="text-xs text-muted-foreground">Enter ports separated by commas. Whatever is listening on them gets terminated — handy for leftover dev servers.</p>
        <div className="flex items-center gap-2">
          <Input
            className="font-mono text-xs"
            placeholder="3000, 3001, 5173"
            aria-label="Ports"
            value={value}
            onChange={(e) => change(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canRun && can(PermissionKeys.PROJECTS_EDIT) && setConfirming(true)}
          />
          <Button variant="destructive" size="sm" className="shrink-0 gap-1.5" disabled={!canRun || !can(PermissionKeys.PROJECTS_EDIT)} loading={kill.isPending} onClick={() => setConfirming(true)}>
            <Zap className="size-3.5" /> Terminate
          </Button>
        </div>
        {invalid.length > 0 && <p className="text-xs text-danger">Not a valid port: {invalid.join(", ")} (use numbers from 1 to 65535).</p>}
      </PanelBody>
      <ConfirmationDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => kill.mutate(ports, { onSettled: () => setConfirming(false) })}
        isLoading={kill.isPending}
        variant="destructive"
        title={`Terminate processes on ${ports.length === 1 ? "port" : "ports"} ${ports.join(", ")}?`}
        description="Every process listening on these ports will be stopped, including ones not started by Dev Station. Unsaved work in them is lost."
        confirmText="Terminate"
      />
    </Panel>
  );
}
