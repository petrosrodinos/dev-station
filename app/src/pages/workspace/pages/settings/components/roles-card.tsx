import { Fragment, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useCreateRole, useDeleteRole, useGetPermissionCatalog, useGetRoles, usePermissions, useUpdateRole } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys, SystemRoleKeys, type PermissionKey, type Role } from "@/features/organizations/interfaces/organizations.interfaces";
import { canEditRole, canGrantPermission } from "@/lib/access.utils";
import { roleSchema, type RoleFormData } from "../validation-schemas/organization.schema";

/** Permission matrix: rows are permissions (grouped), columns are roles. Owner is immutable. */
export function RolesCard() {
  const { data: roles, isPending } = useGetRoles();
  const { data: catalog } = useGetPermissionCatalog();
  const { can, actor } = usePermissions();
  const update = useUpdateRole();
  const create = useCreateRole();
  const remove = useDeleteRole();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [mobileRoleId, setMobileRoleId] = useState<string | null>(null);
  const canEdit = can(PermissionKeys.ORG_MANAGE_ROLES);
  const canEditThis = (role: Role) => canEdit && !!actor && canEditRole(actor, role, SystemRoleKeys.OWNER);
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

  const mobileRole = roles?.find((r) => r.id === mobileRoleId) ?? roles?.[0];

  /** One matrix cell: an editable checkbox, or a read-only tick/dash of the same size. */
  const renderCell = (role: Role, perm: { key: PermissionKey; label: string }) => {
    const allowed = role.permissions.includes(perm.key);
    const editable = canEditThis(role) && !!actor && (allowed || canGrantPermission(actor, perm.key));
    return editable ? (
      <Checkbox checked={allowed} onCheckedChange={() => toggle(role, perm.key)} aria-label={`${perm.label} for ${role.name}`} className="size-[18px]" />
    ) : (
      <span
        className={
          allowed
            ? "flex size-[18px] items-center justify-center rounded-[4px] bg-success-soft text-success"
            : "flex size-[18px] items-center justify-center rounded-[4px] border bg-surface-card text-stone"
        }
        aria-label={`${perm.label} for ${role.name}: ${allowed ? "allowed" : "not allowed"}`}
      >
        {allowed ? <Check className="size-3" /> : <Minus className="size-3" />}
      </span>
    );
  };

  return (
    <Panel className="@container overflow-hidden">
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
        <>
          {/* Narrow panes: pick one role, then a single column of permissions. */}
          <div className="@2xl:hidden">
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <Select value={mobileRole?.id ?? ""} onValueChange={(v) => v && setMobileRoleId(v)}>
                <SelectTrigger className="h-8 min-w-0 flex-1" aria-label="Role">
                  <SelectValue>
                    {mobileRole && (
                      <span className="truncate">
                        {mobileRole.name} <span className="text-muted-foreground">· {mobileRole.member_count} member{mobileRole.member_count === 1 ? "" : "s"}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mobileRole && canEditThis(mobileRole) && !mobileRole.is_system && (
                <Button variant="ghost" size="icon" className="size-8 shrink-0 text-ash hover:text-danger" onClick={() => setDeleting(mobileRole)} aria-label={`Delete role ${mobileRole.name}`}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            {mobileRole &&
              groups.map(([group, items]) => (
                <Fragment key={group}>
                  <div className="bg-surface-elevated/60 px-4 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.4px] text-muted-foreground">{group}</div>
                  {items.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between gap-3 border-b border-hairline-soft px-4 py-2.5 text-[0.7813rem] last:border-b-0">
                      <span className="min-w-0">{perm.label}</span>
                      <span className="flex w-10 shrink-0 justify-center">{renderCell(mobileRole, perm)}</span>
                    </div>
                  ))}
                </Fragment>
              ))}
          </div>

          {/* Wide panes: full matrix, capability column pinned while scrolling sideways. */}
          <div className="hidden overflow-x-auto @2xl:block">
            <table className="w-full table-fixed text-[0.7813rem]" style={{ minWidth: `${14 + (roles?.length ?? 0) * 6.5}rem` }}>
              <colgroup>
                <col className="w-56" />
                {roles?.map((r) => <col key={r.id} />)}
              </colgroup>
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left text-[0.7188rem] font-medium uppercase tracking-[0.4px] text-muted-foreground">Capability</th>
                  {roles?.map((r) => (
                    <th key={r.id} className="px-2 py-2.5 text-center text-[0.7188rem] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate" title={r.name}>
                          {r.name}
                        </span>
                        {canEditThis(r) && !r.is_system && (
                          <button onClick={() => setDeleting(r)} className="shrink-0 text-ash hover:text-danger" aria-label={`Delete role ${r.name}`}>
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-[0.625rem] font-normal normal-case tracking-normal text-ash">
                        {r.member_count} member{r.member_count === 1 ? "" : "s"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(([group, items]) => (
                  <Fragment key={group}>
                    <tr className="bg-surface-elevated/60">
                      <td colSpan={(roles?.length ?? 0) + 1} className="px-4 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                        {group}
                      </td>
                    </tr>
                    {items.map((perm) => (
                      <tr key={perm.key} className="border-b border-hairline-soft">
                        <td className="sticky left-0 z-10 bg-card px-4 py-2">{perm.label}</td>
                        {roles?.map((r) => (
                          <td key={r.id} className="px-2 py-2">
                            <div className="flex justify-center">{renderCell(r, perm)}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
                create.mutate(
                  { ...d, permissions: [PermissionKeys.PROJECTS_VIEW, PermissionKeys.GIT_VIEW_CHANGES, PermissionKeys.INTEGRATIONS_VIEW].filter((p) => actor && canGrantPermission(actor, p)) },
                  { onSuccess: () => setCreating(false) },
                ),
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
