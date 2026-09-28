import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, Github } from "lucide-react";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPreferences, useUpdatePreferences } from "@/features/users/hooks/use-users";
import { useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders } from "@/features/integrations/interfaces/integrations.interfaces";
import { DefaultBranchOptions } from "@/config/constants/dropdowns/settings/default-branch.options";
import { Routes } from "@/routes/routes";
import { gitSettingsSchema, type GitSettingsFormData } from "../validation-schemas/settings.schema";
import { GitIdentitiesSection } from "./git-identities-section";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function GitSettings() {
  const navigate = useNavigate();
  const { data: preferences, isPending } = useGetPreferences();
  const save = useUpdatePreferences();
  const { connections } = useProviderConnections(IntegrationProviders.GITHUB);
  const form = useForm<GitSettingsFormData>({ resolver: zodResolver(gitSettingsSchema), defaultValues: { default_branch: "main" } });

  useEffect(() => {
    if (preferences) form.reset({ default_branch: preferences.default_branch });
  }, [preferences, form]);

  const onSubmit = (data: GitSettingsFormData) => save.mutate({ default_branch: data.default_branch });

  if (isPending) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-8">
      <GitIdentitiesSection />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
