import type { FC } from "react";
import { useCurrentOrganization, usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { OrganizationNameCard } from "./components/organization-name-card";
import { MembersCard } from "./components/members-card";
import { InvitationsCard } from "./components/invitations-card";
import { RolesCard } from "./components/roles-card";
import { JoinOrganizationCard } from "./components/join-organization-card";

/** Organization members, roles and permissions (Spec §21/§22). */
const OrganizationPage: FC = () => {
  const { organization } = useCurrentOrganization();
  const { can } = usePermissions();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div>
          <h1 className="text-lg font-medium">{organization?.name ?? "Organization"}</h1>
          <p className="text-[13px] text-muted-foreground">Members, roles and organization-level permissions.</p>
        </div>
        {can(PermissionKeys.ORG_MANAGE_SETTINGS) && <OrganizationNameCard />}
        <MembersCard />
        {can(PermissionKeys.ORG_MANAGE_MEMBERS) && <InvitationsCard />}
        <RolesCard />
        <JoinOrganizationCard />
      </div>
    </div>
  );
};

export default OrganizationPage;
