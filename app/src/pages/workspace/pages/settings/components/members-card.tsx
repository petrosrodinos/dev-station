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
import { canAssignRole, canModifyMember } from "@/lib/access.utils";
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
  const { can, actor } = usePermissions();
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
          const editable = canManage && !!actor && canModifyMember(actor, { user_id: m.user.id, rank: m.role.rank });
          return (
            <div
              key={m.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-hairline-soft px-4 py-3 last:border-b-0 @lg:grid-cols-[auto_minmax(0,1fr)_10rem_auto]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-surface-card text-[0.6875rem] font-semibold">{generateInitials(m.user.full_name || m.user.email)}</div>
              <div className="min-w-0">
                <div className="text-[0.8125rem] font-medium [overflow-wrap:anywhere]">
                  {m.user.full_name ?? m.user.email} {isMe && <span className="text-muted-foreground">(you)</span>}
                </div>
                <div className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
                  <span className="[overflow-wrap:anywhere]">{m.user.email}</span>
                  <span>
                    <span className="mr-1.5 text-ash">·</span>joined {formatRelative(m.joined_at)}
                  </span>
                </div>
              </div>
              <div className="@lg:order-last">
                {editable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Member actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2 text-danger focus:text-danger" onSelect={() => setRemoving(m)}>
                        <UserMinus className="size-3.5" /> Remove from organization
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="block w-8" />
                )}
              </div>
              <div className="col-start-2 col-end-4 @lg:col-auto">
                {editable ? (
                  <Select value={m.role.id} onValueChange={(role_id) => role_id && updateRole.mutate({ memberId: m.id, role_id })}>
                    <SelectTrigger className="h-8 w-full" aria-label={`Role for ${m.user.email}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.filter((r) => r.id === m.role.id || (actor && canAssignRole(actor, r))).map((r) => (
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
              </div>
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
