import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetMe, useUpdateMe } from "@/features/users/hooks/use-users";
import { useSignOut } from "@/features/auth/hooks/use-auth";
import { environments } from "@/config/environments";
import { accountSchema, type AccountFormData } from "../validation-schemas/settings.schema";
import { ChangePasswordSection } from "./change-password-section";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function AccountSettings() {
  const { data: me } = useGetMe();
  const update = useUpdateMe();
  const signOut = useSignOut();
  const form = useForm<AccountFormData>({ resolver: zodResolver(accountSchema), defaultValues: { full_name: "" } });

  useEffect(() => {
    if (me) form.reset({ full_name: me.full_name ?? "" });
  }, [me, form]);

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => update.mutate(d))}>
          <SettingsSectionHeader title="Account" description="Your profile across organizations." />
          <SettingsRow label="Name">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>
          <SettingsRow label="Email">
            <span className="min-w-0 break-all text-[0.8125rem] text-muted-foreground">{me?.email}</span>
          </SettingsRow>
          <div className="mt-3 flex justify-end">
            <Button type="submit" loading={update.isPending} disabled={!form.formState.isDirty}>
              Save
            </Button>
          </div>
        </form>
      </Form>
      <ChangePasswordSection />
      <section>
        <SettingsSectionHeader title="Session" description={`${environments.APP_NAME} v${environments.APP_VERSION} · API ${environments.API_URL}`} />
        <Button variant="outline" className="gap-1.5 text-danger" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </section>
    </div>
  );
}
