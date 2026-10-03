import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentOrganization, useUpdateOrganization } from "@/features/organizations/hooks/use-organizations";
import { organizationNameSchema, type OrganizationNameFormData } from "../validation-schemas/organization.schema";

export function OrganizationNameCard() {
  const { organization } = useCurrentOrganization();
  const update = useUpdateOrganization();
  const form = useForm<OrganizationNameFormData>({ resolver: zodResolver(organizationNameSchema), defaultValues: { name: "" } });

  useEffect(() => {
    if (organization) form.reset({ name: organization.name });
  }, [organization, form]);

  return (
    <Panel>
      <PanelHeader title="Settings" />
      <PanelBody>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => update.mutate(d))} className="flex flex-col gap-2 @md:flex-row @md:items-start">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full @md:max-w-sm @md:flex-1">
                  <FormControl>
                    <Input aria-label="Organization name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" loading={update.isPending} disabled={!form.formState.isDirty}>
              Rename
            </Button>
          </form>
        </Form>
      </PanelBody>
    </Panel>
  );
}
