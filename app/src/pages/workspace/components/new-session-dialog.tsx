import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Bot, CircleDot } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useProjectLocalStates, useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useAgentAdapters, useStartAgentSession } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { buildIssuePrompt, sessionNameFromPrompt } from "@/features/agent-sessions/utils/issue-prompt.utils";
import { useGetPreferences } from "@/features/users/hooks/use-users";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { useDialogsStore } from "@/stores/dialogs";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { isDesktop } from "@/lib/desktop";
import { AgentTypes, ProjectLocalStates, type AgentType } from "@shared/contract";
import { newSessionSchema, type NewSessionFormData } from "../validation-schemas/workspace.schema";

/** Start an agent CLI in a project, optionally seeded with a Linear issue (Spec §12/§17). */
export function NewSessionDialog() {
  const state = useDialogsStore((s) => s.new_session);
  const close = useDialogsStore((s) => s.closeNewSession);
  const { can } = usePermissions();
  const allowed = can(PermissionKeys.AI_START_AGENTS);
  const { data: projects } = useGetProjects();
  const { data: localStates } = useProjectLocalStates();
  const { data: adapters } = useAgentAdapters();
  const { data: preferences } = useGetPreferences();
  const { data: workspaceConfig } = useWorkspaceConfig();
  const start = useStartAgentSession();
  const issue = state.issue;

  const form = useForm<NewSessionFormData>({
    resolver: zodResolver(newSessionSchema),
    defaultValues: { project_id: "", agent_type: AgentTypes.CLAUDE_CODE, name: "", prompt: "" },
  });

  useEffect(() => {
    if (!state.open) return;
    const project = projects?.find((p) => p.id === state.project_id);
    form.reset({
      project_id: state.project_id ?? "",
      agent_type: (project?.preferred_agent ?? preferences?.preferred_agent ?? AgentTypes.CLAUDE_CODE) as AgentType,
      name: issue ? `${issue.identifier} ${issue.title}`.slice(0, 120) : "",
      prompt: state.initial_prompt ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open]);

  const agentType = form.watch("agent_type");
  const adapter = adapters?.find((a) => a.type === agentType);
  const localProjects = (projects ?? []).filter((p) => localStates?.[p.id] === ProjectLocalStates.LOCAL);

  const onSubmit = (data: NewSessionFormData) => {
    const prompt = issue ? buildIssuePrompt(issue, data.prompt) : data.prompt?.trim() || null;
    start.mutate(
      {
        project_id: data.project_id,
        agent_type: data.agent_type,
        name: data.name?.trim() || sessionNameFromPrompt(data.prompt, `${getAgentTypeLabel(data.agent_type)} session`),
        prompt,
        device_id: workspaceConfig?.device_id ?? null,
        idle_threshold_seconds: preferences?.idle_threshold_seconds,
        issue_provider: issue ? IntegrationProviders.LINEAR : null,
        issue_external_id: issue?.id ?? null,
        issue_key: issue?.identifier ?? null,
        issue_title: issue?.title ?? null,
      },
      { onSuccess: () => close() },
    );
  };

  return (
    <Dialog open={state.open && allowed} onOpenChange={(o) => !o && !start.isPending && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{issue ? "Work on issue with AI" : "New AI session"}</DialogTitle>
          <DialogDescription>The agent runs as its own CLI inside the project folder. Changes are never committed or pushed automatically.</DialogDescription>
        </DialogHeader>

        {!isDesktop() ? (
          <div className="rounded-md border border-warning/40 bg-warning-soft p-3 text-[0.8125rem] text-warning">Agent sessions run locally — open the Dev Station desktop app to start one.</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {issue && (
                <div className="rounded-md border bg-surface-elevated p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CircleDot className="size-3.5" /> <span className="font-mono">{issue.identifier}</span>
                    {issue.state && <span>· {issue.state.name}</span>}
                  </div>
                  <div className="mt-1 text-[0.8125rem] font-medium">{issue.title}</div>
                  <div className="mt-1 text-[0.7188rem] text-muted-foreground">Title, description, labels and recent comments are passed to the agent as its initial prompt.</div>
                </div>
              )}

              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!issue}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {localProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              <ProjectAvatar name={p.name} color={p.color} seed={p.avatar_seed} size="xs" /> {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Runs with your default agent: {getAgentTypeLabel(agentType)}. Change it in Settings → AI.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {adapter && !adapter.available && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft p-2.5 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    <b>{adapter.name}</b> wasn't found on PATH (looked for <code className="font-mono">{adapter.executable}</code>). Install it or set its path in Settings → AI.
                  </span>
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Fix authentication bug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{issue ? "Additional instructions (optional)" : "Initial prompt (optional)"}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} className="font-mono text-[0.7813rem]" placeholder={issue ? "e.g. Keep the public API unchanged; add tests." : "e.g. Fix the failing tests in apps/api/auth"} {...field} />
                    </FormControl>
                    <FormDescription>Leave empty to start an interactive session.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {localProjects.length === 0 && <p className="text-xs text-warning">No project is set up on this device yet — clone or link a project first.</p>}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={close} disabled={start.isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={start.isPending} disabled={adapter?.available === false || start.isPending} className="gap-1.5">
                  {!start.isPending && <Bot className="size-4" />} Start session
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
