import type { FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/routes";
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
  const navigate = useNavigate();
  const location = useLocation();
  // "default" key means this is the first history entry (e.g. opened directly), so fall back to home.
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate(Routes.workspace.root));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground" onClick={goBack}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>
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
