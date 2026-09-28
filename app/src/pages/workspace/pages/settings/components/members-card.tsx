import { useState } from "react";
import { MoreHorizontal, UserMinus } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useCurrentOrganization, useGetMembers, useGetRoles, usePermissions, useRemoveMember, useUpdateMemberRole } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys, SystemRoleKeys, type OrganizationMember, type SystemRoleKey } from "@/features/organizations/interfaces/organizations.interfaces";
import { generateInitials } from "@/features/auth/utils/auth.utils";
import { formatRelative } from "@/lib/date";
import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<SystemRoleKey, string> = {
  [SystemRoleKeys.OWNER]: "bg-warning-soft text-warning",
  [SystemRoleKeys.ADMIN]: "bg-info-soft text-info",
  [SystemRoleKeys.MANAGER]: "bg-success-soft text-success",
  [SystemRoleKeys.DEVELOPER]: "",
  [SystemRoleKeys.VIEWER]: "",
  [SystemRoleKeys.CUSTOM]: "",
};

export function MembersCard() {
  const { data: members, isPending } = useGetMembers();
  const { data: roles } = useGetRoles();
  const { me } = useCurrentOrganization();
  const { can } = usePermissions();
  const updateRole = useUpdateMemberRole();
  const remove = useRemoveMember();
  const [removing, setRemoving] = useState<OrganizationMember | null>(null);
  const canManage = can(PermissionKeys.ORG_MANAGE_MEMBERS);

  return (
    <Panel>
      <PanelHeader title={<>Members {members && <span className="text-muted-foreground">({members.length})</span>}</>} />
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : (
        members?.map((m) => {
          const isMe = m.user.id === me?.id;
          return (
            <div key={m.id} className="flex items-center gap-3 border-b border-hairline-soft px-4 py-3 last:border-b-0">
              <div className="flex size-8 items-center justify-center rounded-full border bg-surface-card text-[0.6875rem] font-semibold">{generateInitials(m.user.full_name || m.user.email)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.8125rem] font-medium">
                  {m.user.full_name ?? m.user.email} {isMe && <span className="text-muted-foreground">(you)</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.user.email} · joined {formatRelative(m.joined_at)}
                </div>
              </div>
              {canManage && !isMe ? (
                <Select value={m.role.id} onValueChange={(role_id) => updateRole.mutate({ memberId: m.id, role_id })}>
                  <SelectTrigger className="h-8 w-40" aria-label={`Role for ${m.user.email}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className={cn("font-medium", ROLE_BADGE[m.role.key])}>
                  {m.role.name}
                </Badge>
              )}
              {canManage && !isMe ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Member actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2 text-danger focus:text-danger" onSelect={() => setRemoving(m)}>
                      <UserMinus className="size-3.5" /> Remove from organization
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="w-8" />
              )}
            </div>
          );
        })
      )}
      <ConfirmationDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        title={`Remove ${removing?.user.full_name ?? removing?.user.email}?`}
        description="They lose access to this organization's projects, integrations and sessions."
        confirmText="Remove member"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </Panel>
  );
}
