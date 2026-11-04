import { Mail } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { useAcceptInvitationById, useMyInvitations } from "@/features/organizations/hooks/use-organizations";
import { formatRelative } from "@/lib/date";

/** Invitations sent to the signed-in user's email: accepted with one click, no invite code to paste. */
export function MyInvitationsCard() {
  const invitations = useMyInvitations();
  const accept = useAcceptInvitationById();
  const list = invitations.data ?? [];

  if (list.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title="Invitations for you" />
      <ul className="divide-y">
        {list.map((invitation) => (
          <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.8125rem] font-medium">{invitation.organization.name}</div>
              <div className="truncate text-[0.7188rem] text-muted-foreground">
                Join as {invitation.role.name}
                {invitation.invited_by_name ? ` · invited by ${invitation.invited_by_name}` : ""} · expires {formatRelative(invitation.expires_at)}
              </div>
            </div>
            <Button size="sm" loading={accept.isPending && accept.variables === invitation.id} disabled={accept.isPending} onClick={() => accept.mutate(invitation.id)}>
              Accept
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
