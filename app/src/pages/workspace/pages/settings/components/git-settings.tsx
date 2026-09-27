import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Github } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPreferences, useUpdatePreferences } from "@/features/users/hooks/use-users";
import { useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { DefaultBranchOptions } from "@/config/constants/dropdowns/settings/default-branch.options";
import { Routes } from "@/routes/routes";
import { gitSettingsSchema, type GitSettingsFormData } from "../validation-schemas/settings.schema";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function GitSettings() {
  const navigate = useNavigate();
  const { data: preferences, isPending } = useGetPreferences();
  const save = useUpdatePreferences();
  const { connections } = useProviderConnections(IntegrationProviders.GITHUB);
  const form = useForm<GitSettingsFormData>({ resolver: zodResolver(gitSettingsSchema), defaultValues: { git_name: "", git_email: "", default_branch: "main" } });

  useEffect(() => {
    if (preferences) form.reset({ git_name: preferences.git_name ?? "", git_email: preferences.git_email ?? "", default_branch: preferences.default_branch });
  }, [preferences, form]);

  const onSubmit = (data: GitSettingsFormData) => save.mutate({ git_name: data.git_name || null, git_email: data.git_email || null, default_branch: data.default_branch });

  if (isPending) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsSectionHeader title="Identity" description="Used as the author of commits made from Dev Station. Leave empty to use your global Git config." />
          <SettingsRow label="Git name">
            <FormField
              control={form.control}
              name="git_name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
          </SettingsRow>
          <SettingsRow label="Git email">
            <FormField
              control={form.control}
              name="git_email"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>
          <SettingsRow label="Default branch" description="Suggested when creating new projects and branches.">
            <FormField
              control={form.control}
              name="default_branch"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-40 font-mono">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DefaultBranchOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="font-mono">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </SettingsRow>
          <SettingsRow label="Destructive operations" description="Discarding changes always asks for confirmation.">
            <span className="text-xs text-muted-foreground">Always confirmed</span>
          </SettingsRow>
          <div className="mt-3 flex justify-end">
            <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
              Save
            </Button>
          </div>
        </form>
      </Form>

      <section>
        <SettingsSectionHeader title="Git accounts" description="GitHub accounts connected through Composio. Each project chooses which one it uses." />
        {connections.map((c) => (
          <div key={c.id} className="flex items-center gap-2 border-b border-hairline-soft py-2 text-[13px]">
            <Github className="size-4 text-muted-foreground" />
            {c.label}
            {c.external_account && <span className="text-muted-foreground">({c.external_account})</span>}
            {c.is_default && <span className="text-xs text-ash">default</span>}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="mt-2 gap-1 text-muted-foreground" onClick={() => navigate(Routes.workspace.integrations)}>
          Manage accounts <ChevronRight className="size-3.5" />
        </Button>
      </section>
    </div>
  );
}
