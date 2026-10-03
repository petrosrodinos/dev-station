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
    <Panel className="@container p-4">
      <div className="flex flex-col gap-3 @md:flex-row @md:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-card">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium">{integration.name}</span>
              {active.length ? (
                <Badge className="whitespace-nowrap bg-success-soft text-success hover:bg-success-soft">{active.length} connected</Badge>
              ) : (
                <Badge variant="secondary" className="whitespace-nowrap">
                  {supported ? "Not connected" : "Coming soon"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[0.7813rem] leading-relaxed text-muted-foreground">{integration.description || getIntegrationProviderDescription(integration.provider)}</p>
          </div>
        </div>
        {can(PermissionKeys.INTEGRATIONS_CONNECT) && supported && (
          <Button size="sm" variant="outline" className="w-full shrink-0 gap-1.5 @md:w-auto" disabled={!integration.available} onClick={() => setConnecting(true)}>
            <Plus className="size-3.5" /> Connect account
          </Button>
        )}
      </div>

      {integration.connections.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-md border border-hairline-soft">
          {integration.connections.map((c) => (
            <div key={c.id} className="flex items-start gap-3 border-b border-hairline-soft px-3 py-2.5 last:border-b-0">
              <StatusDot
                className="mt-1.5 shrink-0"
                status={c.status === ConnectionStatuses.ACTIVE ? "running" : c.status === ConnectionStatuses.INITIATED ? "awaiting" : "crashed"}
                title={getDropdownOptionLabel(ConnectionStatusOptions, c.status)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[0.8125rem] font-medium [overflow-wrap:anywhere]">{c.label}</span>
                  {c.is_default && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[0.6875rem]">
                      Default
                    </Badge>
                  )}
                  {c.status !== ConnectionStatuses.ACTIVE && (
                    <span className="text-[0.6875rem] font-medium text-warning">{getDropdownOptionLabel(ConnectionStatusOptions, c.status)}</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-[0.75rem] text-muted-foreground">
                  {[c.external_account, c.user?.full_name ?? c.user?.email, `Connected ${formatRelative(c.created_at)}`]
                    .filter(Boolean)
                    .map((part, i) => (
                      <span key={i} className="[overflow-wrap:anywhere]">
                        {i > 0 && <span className="mr-1.5 text-ash">·</span>}
                        {part}
                      </span>
                    ))}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="-my-1 size-8 shrink-0 text-muted-foreground" aria-label="Connection actions">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {can(PermissionKeys.INTEGRATIONS_VIEW) && (
                    <DropdownMenuItem className="gap-2" onSelect={() => refresh.mutate(c.id)}>
                      <RefreshCw className="size-3.5" /> Check status
                    </DropdownMenuItem>
                  )}
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
