import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAcceptInvitation } from "@/features/organizations/hooks/use-organizations";
import { joinOrganizationSchema, type JoinOrganizationFormData } from "../validation-schemas/organization.schema";

export function JoinOrganizationCard() {
  const accept = useAcceptInvitation();
  const form = useForm<JoinOrganizationFormData>({ resolver: zodResolver(joinOrganizationSchema), defaultValues: { token: "" } });

  return (
    <Panel>
      <PanelHeader title="Join with an invite code" />
      <PanelBody>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => accept.mutate(d.token, { onSuccess: () => form.reset() }))} className="flex flex-col gap-2 @md:flex-row @md:items-start">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Paste the invite code you received" className="font-mono text-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="secondary" loading={accept.isPending}>
              Join organization
            </Button>
          </form>
        </Form>
      </PanelBody>
    </Panel>
  );
}
