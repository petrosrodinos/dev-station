import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListChecks } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useUpdateProject } from "@/features/projects/hooks/use-projects";
import { useGetLinearProjects, useGetLinearTeams, useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { Routes } from "@/routes/routes";
import { linearSettingsSchema, type LinearSettingsFormData } from "../../../validation-schemas/project.schema";

const ANY = "__any";

/** Choose which connected Linear account / team / project feeds this Dev Station project. */
export function LinearSettingsCard({ project, onDone }: { project: Project; onDone: () => void }) {
  const navigate = useNavigate();
  const { connections, isPending } = useProviderConnections(IntegrationProviders.LINEAR);
  const update = useUpdateProject();
  const { can } = usePermissions();
  const form = useForm<LinearSettingsFormData>({
    resolver: zodResolver(linearSettingsSchema),
    defaultValues: {
      linear_connection_id: project.linear_connection_id ?? undefined,
      linear_team_id: project.linear_team_id ?? undefined,
      linear_project_id: project.linear_project_id ?? undefined,
    },
  });
  const connectionId = form.watch("linear_connection_id") ?? null;
  const teamId = form.watch("linear_team_id") ?? null;
  const { data: teams } = useGetLinearTeams(connectionId);
  const { data: linearProjects } = useGetLinearProjects(connectionId, teamId);

  useEffect(() => {
    if (!form.getValues("linear_connection_id") && connections[0]) form.setValue("linear_connection_id", connections[0].id);
  }, [connections, form]);

  if (!isPending && connections.length === 0) {
    return (
      <Panel>
        <EmptyState
          className="py-14"
          icon={<ListChecks />}
          title="Linear isn't connected"
          description="Connect a Linear workspace in Integrations to see this project's issues here and hand them to an AI agent."
          action={<Button onClick={() => navigate(Routes.workspace.integrations)}>Go to Integrations</Button>}
        />
      </Panel>
    );
  }

  const onSubmit = (data: LinearSettingsFormData) =>
    update.mutate(
      {
        id: project.id,
        linear_connection_id: data.linear_connection_id ?? null,
        linear_team_id: data.linear_team_id && data.linear_team_id !== ANY ? data.linear_team_id : null,
        linear_project_id: data.linear_project_id && data.linear_project_id !== ANY ? data.linear_project_id : null,
      },
      { onSuccess: onDone },
    );

  return (
    <Panel className="max-w-2xl">
      <PanelHeader title="Link Linear to this project" />
      <PanelBody>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="linear_connection_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linear account</FormLabel>
                  <Select value={field.value} onValueChange={(v) => (field.onChange(v), form.setValue("linear_team_id", undefined), form.setValue("linear_project_id", undefined))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                          {c.external_account ? ` (${c.external_account})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="linear_team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select value={field.value ?? ANY} onValueChange={(v) => (field.onChange(v), form.setValue("linear_project_id", undefined))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ANY}>All teams</SelectItem>
                        {teams?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linear_project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linear project</FormLabel>
                    <Select value={field.value ?? ANY} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ANY}>All projects</SelectItem>
                        {linearProjects?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              {project.linear_connection_id && (
                <Button type="button" variant="outline" onClick={onDone}>
                  Cancel
                </Button>
              )}
              <Button type="submit" loading={update.isPending} disabled={!can(PermissionKeys.PROJECTS_EDIT) || !connectionId}>
                Save
              </Button>
            </div>
          </form>
        </Form>
      </PanelBody>
    </Panel>
  );
}
