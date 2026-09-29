import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, Plus, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentOrganization, usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { RoleKeyOptions } from "@/config/constants/dropdowns/users/role-key.options";
import { SettingsSections } from "@/config/constants/dropdowns/settings/settings-section.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { useWorkspaceStore } from "@/stores/workspace";
import { Routes } from "@/routes/routes";
import { CreateOrganizationDialog } from "./create-organization-dialog";

type Side = "left" | "right" | "top" | "bottom";

/** Organization switcher, rendered as a project-rail button (icon only; the name is in the tooltip). */
export function OrganizationMenu({ side }: { side: Side }) {
  const navigate = useNavigate();
  const { organization, me } = useCurrentOrganization();
  const { can } = usePermissions();
  const setActiveOrganization = useWorkspaceStore((s) => s.setActiveOrganization);
  const [createOpen, setCreateOpen] = useState(false);

  const switchOrganization = (id: string) => {
    setActiveOrganization(id);
    navigate(Routes.workspace.root);
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label={`Organization: ${organization?.name ?? "none selected"}`}
                    className="relative flex size-10 items-center justify-center rounded-lg bg-surface-elevated text-muted-foreground hover:text-foreground"
                  >
                    <Building2 className="size-4" />
                  </button>
                }
              />
            }
          />
          <TooltipContent side={side}>{organization?.name ?? "Select organization"}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side={side} align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
          {me?.organizations.map((org) => (
            <DropdownMenuItem key={org.id} onSelect={() => switchOrganization(org.id)} className="gap-2">
              <Building2 className="size-3.5" />
              <span className="flex-1 truncate">{org.name}</span>
              <span className="text-[0.6875rem] text-muted-foreground">{getDropdownOptionLabel(RoleKeyOptions, org.role.key)}</span>
              {org.id === organization?.id && <Check className="size-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-3.5" /> New organization
          </DropdownMenuItem>
          {can({ any: [PermissionKeys.ORG_MANAGE_MEMBERS, PermissionKeys.ORG_MANAGE_ROLES, PermissionKeys.ORG_MANAGE_SETTINGS] }) && (
            <DropdownMenuItem onSelect={() => navigate(Routes.workspace.settings_section(SettingsSections.ORGANIZATION))} className="gap-2">
              <Settings className="size-3.5" /> Manage organization
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
