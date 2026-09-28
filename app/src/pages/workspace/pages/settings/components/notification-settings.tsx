import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useGetPreferences, useUpdatePreferences } from "@/features/users/hooks/use-users";
import { NotificationChannels } from "@/features/users/interfaces/users.interfaces";
import { notificationSettingsSchema, type NotificationSettingsFormData } from "@/features/users/validation-schemas/notification-settings.schema";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/features/users/utils/notification-settings.utils";
import { showOsNotification } from "@/features/users/services/notifications.services";
import { NotificationChannelDescriptionOptions, NotificationChannelOptions } from "@/config/constants/dropdowns/notifications/notification-channel.options";
import { NotificationEventDescriptionOptions, NotificationEventOptions } from "@/config/constants/dropdowns/notifications/notification-event.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { isDesktop } from "@/lib/desktop";
import { SettingsRow, SettingsSectionHeader } from "./settings-row";

export function NotificationSettings() {
  const { data: preferences, isPending } = useGetPreferences();
  const save = useUpdatePreferences();
  const desktop = isDesktop();
  const form = useForm<NotificationSettingsFormData>({ resolver: zodResolver(notificationSettingsSchema), defaultValues: DEFAULT_NOTIFICATION_SETTINGS });
  const enabled = form.watch("enabled");

  useEffect(() => {
    if (preferences) form.reset(preferences.notification_settings);
  }, [preferences, form]);

  const onSubmit = (data: NotificationSettingsFormData) => save.mutate({ notification_settings: data });

  const sendTest = async () => {
    try {
      const shown = await showOsNotification({ title: "Dev Station", body: "Desktop notifications are working." });
      if (!shown) toast({ title: "Desktop notifications are not supported on this system", variant: "error" });
    } catch (error) {
      toast({ title: "Could not send test notification", description: error instanceof Error ? error.message : undefined, variant: "error" });
    }
  };

  const channels = NotificationChannelOptions.filter((c) => desktop || c.id !== NotificationChannels.OS);

  return (
    <section>
      <SettingsSectionHeader title="Notifications" description="Choose which events notify you, and how. Saved to your account." />
      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SettingsRow label="Enable notifications" description="Master switch. When off, configurable events are silent everywhere.">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Enable notifications" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SettingsRow>

            <div className={enabled ? undefined : "pointer-events-none opacity-50"} aria-disabled={!enabled}>
              <div className="flex items-center justify-end gap-6 border-b border-hairline-soft py-2 text-xs text-muted-foreground">
                {channels.map((c) => (
                  <span key={c.id} className="w-14 text-center" title={getDropdownOptionLabel(NotificationChannelDescriptionOptions, c.id)}>
                    {c.label}
                  </span>
                ))}
              </div>
              {NotificationEventOptions.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-6 border-b border-hairline-soft py-3">
                  <div className="min-w-0">
                    <div className="text-[0.8125rem]">{event.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{getDropdownOptionLabel(NotificationEventDescriptionOptions, event.id)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-6">
                    {channels.map((channel) => (
                      <FormField
                        key={channel.id}
                        control={form.control}
                        name={`events.${event.id}.${channel.id}`}
                        render={({ field }) => (
                          <FormItem className="flex w-14 justify-center">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!enabled} aria-label={`${event.label}: ${channel.label}`} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              {desktop && (
                <Button type="button" variant="outline" onClick={sendTest}>
                  Send test notification
                </Button>
              )}
              <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
                Save notifications
              </Button>
            </div>
          </form>
        </Form>
      )}
    </section>
  );
}
