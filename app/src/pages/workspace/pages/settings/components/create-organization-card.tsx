import { useState } from "react";
import { Plus } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { CreateOrganizationDialog } from "@/pages/workspace/components/create-organization-dialog";

export function CreateOrganizationCard() {
  const [open, setOpen] = useState(false);

  return (
    <Panel>
      <PanelHeader title="Create a new organization" />
      <PanelBody>
        <div className="flex flex-col items-start gap-3 @md:flex-row @md:items-center @md:justify-between @md:gap-4">
          <p className="text-xs text-muted-foreground">Start a separate organization with its own members, roles and projects.</p>
          <Button type="button" variant="secondary" className="shrink-0" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New organization
          </Button>
        </div>
      </PanelBody>
      <CreateOrganizationDialog open={open} onOpenChange={setOpen} />
    </Panel>
  );
}
