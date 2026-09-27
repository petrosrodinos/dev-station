import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateDeviceSettings, useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useUpdatePreferences } from "@/features/users/hooks/use-users";
import { ThemeOptions } from "@/config/constants/dropdowns/settings/theme.options";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { isDesktop } from "@/lib/desktop";
import { DirectoryField } from "@/pages/workspace/components/project-form/directory-field";
import { deviceSettingsSchema, type DeviceSettingsFormData } from "../validation-schemas/settings.schema";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function GeneralSettings() {
  const { theme, setTheme } = useTheme();
  const savePreferences = useUpdatePreferences();
  const { data: config, isPending } = useWorkspaceConfig();
  const save = useUpdateDeviceSettings();
  const form = useForm<DeviceSettingsFormData>({ resolver: zodResolver(deviceSettingsSchema), defaultValues: { workspace_dir: "" } });

  useEffect(() => {
    if (config)
      form.reset({
        workspace_dir: config.settings.workspace_dir,
        default_shell: config.settings.default_shell ?? "",
        cursor_path: config.settings.editor_executables.cursor ?? "",
        vscode_path: config.settings.editor_executables.vscode ?? "",
      });
  }, [config, form]);

  const onSubmit = (data: DeviceSettingsFormData) =>
    save.mutate({
      workspace_dir: data.workspace_dir,
      default_shell: data.default_shell || null,
      editor_executables: { cursor: data.cursor_path || null, vscode: data.vscode_path || null },
    });

  return (
    <div className="space-y-8">
      <section>
        <SettingsSectionHeader title="Appearance" description="Dark is the primary theme." />
        <SettingsRow label="Theme">
          <Select
            value={theme}
            onValueChange={(v) => {
              setTheme(v as Theme);
              savePreferences.mutate({ theme: v });
            }}
          >
            <SelectTrigger className="w-40" aria-label="Theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ThemeOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Notifications" description="Finished or waiting AI sessions show a badge on the project in the rail and an entry in the activity feed — no pop-ups.">
          <span className="text-xs text-muted-foreground">Rail badges + activity feed</span>
        </SettingsRow>
      </section>

      <section>
        <SettingsSectionHeader title="This device" description="Stored only on this computer — never synced to your organization." />
        {!isDesktop() ? (
          <div className="text-[13px] text-muted-foreground">Available in the desktop app.</div>
        ) : isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <SettingsRow label="Workspace directory" description="New projects are cloned to <workspace>/<Client>/<Project>.">
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
    </div>
  );
}
