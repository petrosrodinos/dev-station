import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useChangePassword } from "@/features/users/hooks/use-users";
import { changePasswordSchema, type ChangePasswordFormData } from "../validation-schemas/settings.schema";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

const EMPTY: ChangePasswordFormData = { current_password: "", new_password: "", confirm_password: "" };

const FIELDS = [
  { name: "current_password", label: "Current password", autoComplete: "current-password" },
  { name: "new_password", label: "New password", autoComplete: "new-password" },
  { name: "confirm_password", label: "Confirm password", autoComplete: "new-password" },
] as const;

export function ChangePasswordSection() {
  const change = useChangePassword();
  const form = useForm<ChangePasswordFormData>({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY });

  const onSubmit = ({ current_password, new_password }: ChangePasswordFormData) =>
    change.mutate({ current_password, new_password }, { onSuccess: () => form.reset(EMPTY) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SettingsSectionHeader title="Password" description="Use at least 8 characters." />
        {FIELDS.map(({ name, label, autoComplete }) => (
          <SettingsRow key={name} label={label}>
            <FormField
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <PasswordInput autoComplete={autoComplete} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsRow>
        ))}
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={change.isPending} disabled={!form.formState.isDirty}>
            Change password
          </Button>
        </div>
      </form>
    </Form>
  );
}
