import { Fragment, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useCreateRole, useDeleteRole, useGetPermissionCatalog, useGetRoles, usePermissions, useUpdateRole } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys, SystemRoleKeys, type PermissionKey, type Role } from "@/features/organizations/interfaces/organizations.interfaces";
import { roleSchema, type RoleFormData } from "../validation-schemas/organization.schema";

/** Permission matrix: rows are permissions (grouped), columns are roles. Owner is immutable. */
export function RolesCard() {
  const { data: roles, isPending } = useGetRoles();
  const { data: catalog } = useGetPermissionCatalog();
  const { can } = usePermissions();
  const update = useUpdateRole();
  const create = useCreateRole();
  const remove = useDeleteRole();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const canEdit = can(PermissionKeys.ORG_MANAGE_ROLES);
  const form = useForm<RoleFormData>({ resolver: zodResolver(roleSchema), defaultValues: { name: "", description: "" } });

  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof catalog>>();
    for (const item of catalog ?? []) map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return [...map.entries()];
  }, [catalog]);

  const toggle = (role: Role, permission: PermissionKey) => {
    const next = role.permissions.includes(permission) ? role.permissions.filter((p) => p !== permission) : [...role.permissions, permission];
    update.mutate({ id: role.id, permissions: next });
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Roles & permissions"
        actions={
          canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                form.reset({ name: "", description: "" });
                setCreating(true);
              }}
            >
              <Plus className="size-3.5" /> Custom role
            </Button>
          )
        }
      />
      {isPending || !catalog ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.4px] text-muted-foreground">Capability</th>
                {roles?.map((r) => (
                  <th key={r.id} className="px-2 py-2.5 text-center text-[11.5px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      {r.name}
                      {canEdit && !r.is_system && (
                        <button onClick={() => setDeleting(r)} className="text-ash hover:text-danger" aria-label={`Delete role ${r.name}`}>
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] font-normal normal-case tracking-normal text-ash">{r.member_count} member{r.member_count === 1 ? "" : "s"}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([group, items]) => (
                <Fragment key={group}>
                  <tr className="bg-surface-elevated/60">
                    <td colSpan={(roles?.length ?? 0) + 1} className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                      {group}
                    </td>
                  </tr>
                  {items.map((perm) => (
                    <tr key={perm.key} className="border-b border-hairline-soft">
                      <td className="px-4 py-2">{perm.label}</td>
                      {roles?.map((r) => {
                        const allowed = r.permissions.includes(perm.key);
                        const editable = canEdit && r.key !== SystemRoleKeys.OWNER;
                        return (
                          <td key={r.id} className="px-2 py-2 text-center">
                            {editable ? (
                              <Checkbox checked={allowed} onCheckedChange={() => toggle(r, perm.key)} aria-label={`${perm.label} for ${r.name}`} />
                            ) : (
                              <span
                                className={
                                  allowed
                                    ? "inline-flex size-5 items-center justify-center rounded-xs bg-success-soft text-success"
                                    : "inline-flex size-5 items-center justify-center rounded-xs border bg-surface-card text-stone"
                                }
                              >
                                {allowed ? <Check className="size-3" /> : <Minus className="size-3" />}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={creating} onOpenChange={(o) => !create.isPending && setCreating(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New custom role</DialogTitle>
            <DialogDescription>Starts with view-only access; tick permissions in the matrix afterwards.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) =>
                create.mutate({ ...d, permissions: [PermissionKeys.PROJECTS_VIEW, PermissionKeys.GIT_VIEW_CHANGES, PermissionKeys.INTEGRATIONS_VIEW] }, { onSuccess: () => setCreating(false) }),
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Client reviewer" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={create.isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={create.isPending}>
                  Create role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        title={`Delete role ${deleting?.name}?`}
        description="Only roles without members can be deleted."
        confirmText="Delete role"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </Panel>
  );
}
