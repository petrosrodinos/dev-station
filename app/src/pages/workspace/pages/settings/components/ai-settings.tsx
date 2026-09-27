import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPreferences, useUpdatePreferences } from "@/features/users/hooks/use-users";
import { useUpdateDeviceSettings, useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useAgentAdapters } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { setAgentIdleThreshold } from "@/features/agent-sessions/services/agent-runtime.services";
import { AgentTypeFormOptions } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { IdleThresholdOptions } from "@/config/constants/dropdowns/agents/idle-threshold.options";
import { isDesktop } from "@/lib/desktop";
import { AgentTypes, type AgentType } from "@shared/contract";
import { aiSettingsSchema, type AiSettingsFormData } from "../validation-schemas/settings.schema";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function AiSettings() {
  const { data: preferences, isPending } = useGetPreferences();
  const { data: config } = useWorkspaceConfig();
  const { data: adapters } = useAgentAdapters();
  const savePreferences = useUpdatePreferences();
  const saveDevice = useUpdateDeviceSettings();
  const form = useForm<AiSettingsFormData>({ resolver: zodResolver(aiSettingsSchema), defaultValues: { preferred_agent: AgentTypes.CLAUDE_CODE, idle_threshold_seconds: "45" } });

  useEffect(() => {
    if (!preferences) return;
    form.reset({
      preferred_agent: preferences.preferred_agent,
      idle_threshold_seconds: String(preferences.idle_threshold_seconds),
      claude_path: config?.settings.agent_executables.CLAUDE_CODE ?? "",
      cursor_agent_path: config?.settings.agent_executables.CURSOR_CLI ?? "",
    });
  }, [preferences, config, form]);

  const onSubmit = (data: AiSettingsFormData) => {
    const idle = Number(data.idle_threshold_seconds);
    savePreferences.mutate({ preferred_agent: data.preferred_agent, idle_threshold_seconds: idle });
    if (isDesktop()) {
      void setAgentIdleThreshold(idle).catch(() => undefined);
      saveDevice.mutate({ agent_executables: { CLAUDE_CODE: data.claude_path || null, CURSOR_CLI: data.cursor_agent_path || null } });
    }
  };

  if (isPending) return <Skeleton className="h-48 w-full" />;

  const adapterStatus = (type: AgentType) => {
    const a = adapters?.find((x) => x.type === type);
    if (!a) return null;
    return a.available ? (
      <span className="flex items-center gap-1 truncate text-xs text-success" title={a.resolved_path ?? ""}>
        <CheckCircle2 className="size-3.5 shrink-0" /> {a.resolved_path}
      </span>
    ) : (
      <span className="flex items-center gap-1 text-xs text-danger">
        <XCircle className="size-3.5" /> Not found on PATH
      </span>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SettingsSectionHeader title="AI agents" description="Agents run as their own CLIs in an embedded terminal. Dev Station never auto-commits their changes." />
        <SettingsRow label="Preferred agent" description="Used when starting a session without choosing one.">
          <FormField
            control={form.control}
            name="preferred_agent"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AgentTypeFormOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </SettingsRow>
        <SettingsRow label="Idle threshold" description="No output for this long while running marks a session “Awaiting input”.">
          <FormField
            control={form.control}
            name="idle_threshold_seconds"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {IdleThresholdOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </SettingsRow>
        {isDesktop() && (
          <>
            <SettingsRow label="Claude Code executable" description={adapterStatus(AgentTypes.CLAUDE_CODE)}>
              <FormField
                control={form.control}
                name="claude_path"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input className="font-mono text-xs" placeholder="claude (from PATH)" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SettingsRow>
            <SettingsRow label="Cursor CLI executable" description={adapterStatus(AgentTypes.CURSOR_CLI)}>
              <FormField
                control={form.control}
                name="cursor_agent_path"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input className="font-mono text-xs" placeholder="cursor-agent (from PATH)" {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SettingsRow>
          </>
        )}
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={savePreferences.isPending || saveDevice.isPending} disabled={!form.formState.isDirty}>
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
