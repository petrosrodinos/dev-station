import { useEffect, useState } from "react";
import { FileText, Github, ListChecks, MessageSquare, MoreHorizontal, Plug, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import type { Integration, IntegrationConnection, IntegrationProvider } from "@/features/integrations/interfaces/integrations.interfaces";
import { ConnectionStatuses, IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { useDisconnectConnection, useRefreshConnection, useUpdateConnection } from "@/features/integrations/hooks/use-integrations";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { ConnectionStatusOptions } from "@/config/constants/dropdowns/integrations/connection-status.options";
import { getIntegrationProviderDescription } from "@/config/constants/dropdowns/integrations/integration-provider-description.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { formatRelative } from "@/lib/date";
import { ConnectAccountDialog } from "./connect-account-dialog";

const PROVIDER_ICON: Record<IntegrationProvider, typeof Github> = {
  [IntegrationProviders.GITHUB]: Github,
  [IntegrationProviders.LINEAR]: ListChecks,
  [IntegrationProviders.NOTION]: FileText,
  [IntegrationProviders.SLACK]: MessageSquare,
};

export function IntegrationCard({ integration }: { integration: Integration }) {
  const { can } = usePermissions();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<IntegrationConnection | null>(null);
  const refresh = useRefreshConnection();
  const poll = useRefreshConnection({ silent: true });
  const update = useUpdateConnection();
  const disconnect = useDisconnectConnection();
  const Icon = PROVIDER_ICON[integration.provider] ?? Plug;
  const active = integration.connections.filter((c) => c.status === ConnectionStatuses.ACTIVE);
  const pending = integration.connections.filter((c) => c.status === ConnectionStatuses.INITIATED);
  const supported = integration.supported;

  // After OAuth in the browser, poll pending connections briefly so they flip to "Connected" on their own.
  useEffect(() => {
    if (!pending.length) return;
    let tries = 0;
    const t = setInterval(() => {
      if (++tries > 24) return clearInterval(t);
      pending.forEach((c) => poll.mutate(c.id));
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.map((c) => c.id).join(",")]);

  return (
    <Panel className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-card">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{integration.name}</span>
            {active.length ? (
              <Badge className="bg-success-soft text-success hover:bg-success-soft">{active.length} connected</Badge>
            ) : (
              <Badge variant="secondary">{supported ? "Not connected" : "Coming soon"}</Badge>
            )}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">{integration.description || getIntegrationProviderDescription(integration.provider)}</div>
        </div>
        {can(PermissionKeys.INTEGRATIONS_CONNECT) && supported && (
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" disabled={!integration.available} onClick={() => setConnecting(true)}>
            <Plus className="size-3.5" /> Connect account
          </Button>
        )}
      </div>

      {integration.connections.length > 0 && (
        <div className="mt-3 space-y-1 border-t pt-3">
          {integration.connections.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-sm py-1 text-[12.5px]">
              <StatusDot
                status={c.status === ConnectionStatuses.ACTIVE ? "running" : c.status === ConnectionStatuses.INITIATED ? "awaiting" : "crashed"}
                title={getDropdownOptionLabel(ConnectionStatusOptions, c.status)}
              />
              <span className="truncate font-medium">{c.label}</span>
              {c.external_account && <span className="truncate text-muted-foreground">{c.external_account}</span>}
              {c.is_default && <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">Default</Badge>}
              {c.status !== ConnectionStatuses.ACTIVE && <span className="text-[11.5px] text-warning">{getDropdownOptionLabel(ConnectionStatusOptions, c.status)}</span>}
              <span className="ml-auto shrink-0 text-[11px] text-ash">
                {c.user?.full_name ?? c.user?.email} · {formatRelative(c.created_at)}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" aria-label="Connection actions">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => refresh.mutate(c.id)}>
                    <RefreshCw className="size-3.5" /> Check status
                  </DropdownMenuItem>
                  {can(PermissionKeys.INTEGRATIONS_MANAGE) && !c.is_default && c.status === ConnectionStatuses.ACTIVE && (
                    <DropdownMenuItem className="gap-2" onSelect={() => update.mutate({ id: c.id, is_default: true })}>
                      <Star className="size-3.5" /> Make default
                    </DropdownMenuItem>
                  )}
                  {can(PermissionKeys.INTEGRATIONS_DISCONNECT) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 text-danger focus:text-danger" onSelect={() => setDisconnecting(c)}>
                        <Trash2 className="size-3.5" /> Disconnect
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <ConnectAccountDialog provider={integration.provider} providerName={integration.name} existingCount={integration.connections.length} open={connecting} onOpenChange={setConnecting} />
      <ConfirmationDialog
        isOpen={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        onConfirm={() => disconnecting && disconnect.mutate(disconnecting.id, { onSuccess: () => setDisconnecting(null) })}
        title={`Disconnect ${disconnecting?.label ?? "account"}?`}
        description="Access is revoked in Composio. Projects using this account will need to be assigned a different connected account."
        confirmText="Disconnect"
        variant="destructive"
        isLoading={disconnect.isPending}
      />
    </Panel>
  );
}
