import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentOrganization } from "@/features/organizations/hooks/use-organizations";
import { RoleKeyOptions } from "@/config/constants/dropdowns/users/role-key.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { Routes } from "@/routes/routes";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function OrganizationSettings() {
  const navigate = useNavigate();
  const { organization } = useCurrentOrganization();
  return (
    <div>
      <SettingsSectionHeader title="Organization" description="Members, roles and permissions are managed per organization." />
      <SettingsRow label="Current organization">
        <span className="text-[13px]">{organization?.name}</span>
      </SettingsRow>
      <SettingsRow label="Your role">
        <span className="text-[13px]">{organization ? getDropdownOptionLabel(RoleKeyOptions, organization.role.key) : "—"}</span>
      </SettingsRow>
      <SettingsRow label="Your permissions" description={organization?.permissions.length ? `${organization.permissions.length} permissions granted by your role` : undefined}>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(Routes.workspace.organization)}>
          Members & roles <ChevronRight className="size-3.5" />
        </Button>
      </SettingsRow>
    </div>
  );
}
