import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Toggle from "@/components/ui/Toggle";
import { useUpdateDeviceSettings, useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { isDesktop } from "@/lib/desktop";
import { DirectoryField } from "@/pages/workspace/components/project-form/directory-field";
import { deviceSettingsSchema, type DeviceSettingsFormData } from "../validation-schemas/settings.schema";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";
import { AboutSection } from "./about-section";

export function GeneralSettings() {
  const { data: config, isPending } = useWorkspaceConfig();
  const save = useUpdateDeviceSettings();
  const saveServices = useUpdateDeviceSettings();
  const form = useForm<DeviceSettingsFormData>({ resolver: zodResolver(deviceSettingsSchema), defaultValues: { workspace_dir: "" } });

  useEffect(() => {
    // Skip while editing: toggling "Services" settings refreshes `config` and must not wipe unsaved fields.
    if (config && !form.formState.isDirty)
      form.reset({
        workspace_dir: config.settings.workspace_dir,
        default_shell: config.settings.default_shell ?? "",
        cursor_path: config.settings.editor_executables.cursor ?? "",
        vscode_path: config.settings.editor_executables.vscode ?? "",
      });
  }, [config, form]);

  const onSubmit = (data: DeviceSettingsFormData) =>
    save.mutate(
      {
        workspace_dir: data.workspace_dir,
        default_shell: data.default_shell || null,
        editor_executables: { cursor: data.cursor_path || null, vscode: data.vscode_path || null },
      },
      { onSuccess: () => form.reset(data) },
    );

  return (
    <div className="space-y-8">
      <section>
        <SettingsSectionHeader title="This device" description="Stored only on this computer — never synced to your organization." />
        {!isDesktop() ? (
          <div className="text-[0.8125rem] text-muted-foreground">Available in the desktop app.</div>
        ) : isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <SettingsRow label="Workspace directory" description="New projects are cloned to <workspace>/<Project>.">
                <FormField
                  control={form.control}
                  name="workspace_dir"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <DirectoryField value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsRow>
              <SettingsRow label="Default shell" description="Used for integrated terminals. Leave empty for the system default.">
                <FormField
                  control={form.control}
                  name="default_shell"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input className="font-mono text-xs" placeholder="System default" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </SettingsRow>
              <SettingsRow label="Cursor executable" description="Leave empty to use `cursor` from PATH.">
                <FormField
                  control={form.control}
                  name="cursor_path"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input className="font-mono text-xs" placeholder="cursor" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </SettingsRow>
              <SettingsRow label="VS Code executable" description="Leave empty to use `code` from PATH.">
                <FormField
                  control={form.control}
                  name="vscode_path"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input className="font-mono text-xs" placeholder="code" {...field} value={field.value ?? ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </SettingsRow>
              <div className="mt-3 flex justify-end">
                <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
                  Save device settings
                </Button>
              </div>
            </form>
          </Form>
        )}
      </section>
      {isDesktop() && config && (
        <section>
          <SettingsSectionHeader title="Services" description="Applies to every project on this computer." />
          <SettingsRow
            label="Move services to a free port"
            description="If a service's port is taken, start it on the next free one and update the URLs that point to it. Turn off to always use the configured port."
          >
            <Toggle
              enabled={config.settings.auto_shift_ports}
              isLoading={saveServices.isPending}
              onCheckedChange={(checked) => saveServices.mutate({ auto_shift_ports: checked })}
            />
          </SettingsRow>
        </section>
      )}
      <AboutSection />
    </div>
  );
}
