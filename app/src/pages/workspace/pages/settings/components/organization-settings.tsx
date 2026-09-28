import { useCurrentOrganization, usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { SettingsSectionHeader } from "./settings-row";
import { OrganizationNameCard } from "./organization-name-card";
import { MembersCard } from "./members-card";
import { InvitationsCard } from "./invitations-card";
import { RolesCard } from "./roles-card";
import { JoinOrganizationCard } from "./join-organization-card";

export function OrganizationSettings() {
  const { organization } = useCurrentOrganization();
  const { can } = usePermissions();
  return (
    <div className="space-y-4">
      <SettingsSectionHeader title={organization?.name ?? "Organization"} description="Members, roles and organization-level permissions." />
      {can(PermissionKeys.ORG_MANAGE_SETTINGS) && <OrganizationNameCard />}
      <MembersCard />
      {can(PermissionKeys.ORG_MANAGE_MEMBERS) && <InvitationsCard />}
      <RolesCard />
      <JoinOrganizationCard />
    </div>
  );
}
