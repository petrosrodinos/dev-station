import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Plus, X } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useCreateInvitation, useGetInvitations, useGetRoles, useRevokeInvitation } from "@/features/organizations/hooks/use-organizations";
import { SystemRoleKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { formatRelative } from "@/lib/date";
import { toast } from "@/hooks/use-toast";
import { inviteMemberSchema, type InviteMemberFormData } from "../validation-schemas/organization.schema";

export function InvitationsCard() {
  const { data: invitations, isPending } = useGetInvitations();
  const { data: roles } = useGetRoles();
  const create = useCreateInvitation();
  const revoke = useRevokeInvitation();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const form = useForm<InviteMemberFormData>({ resolver: zodResolver(inviteMemberSchema), defaultValues: { email: "", role_id: "" } });

  const openDialog = () => {
    setToken(null);
    form.reset({ email: "", role_id: roles?.find((r) => r.key === SystemRoleKeys.DEVELOPER)?.id ?? "" });
    setOpen(true);
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Invite code copied", duration: 1500 });
  };

  return (
    <Panel>
      <PanelHeader
        title="Invitations"
        actions={
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={openDialog}>
            <Plus className="size-3.5" /> Invite member
          </Button>
        }
      />
      {isPending ? (
        <ListSkeleton rows={2} />
      ) : !invitations?.length ? (
        <PanelBody className="text-[13px] text-ash">No pending invitations.</PanelBody>
      ) : (
        invitations.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 border-b border-hairline-soft px-4 py-2.5 text-[13px] last:border-b-0">
            <span className="flex-1 truncate">{inv.email}</span>
            <span className="text-xs text-muted-foreground">{inv.role.name}</span>
            <span className="text-xs text-ash">sent {formatRelative(inv.created_at)}</span>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => setRevoking(inv.id)} aria-label={`Revoke invitation for ${inv.email}`}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={(o) => !create.isPending && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{token ? "Invitation created" : "Invite member"}</DialogTitle>
            <DialogDescription>
              {token ? "Share this invite code. They can join from Organization → “Join with an invite code”." : "They join with the role you choose; you can change it later."}
            </DialogDescription>
          </DialogHeader>
          {token ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input readOnly value={token} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => void copy(token)} aria-label="Copy invite code">
                  <Copy className="size-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => create.mutate(d, { onSuccess: (res) => setToken(res.token) }))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="dev@agency.com" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles
                            ?.filter((r) => r.key !== SystemRoleKeys.OWNER)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={create.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={create.isPending}>
                    Create invitation
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && revoke.mutate(revoking, { onSuccess: () => setRevoking(null) })}
        title="Revoke invitation?"
        description="The invite code stops working immediately."
        confirmText="Revoke"
        variant="destructive"
        isLoading={revoke.isPending}
      />
    </Panel>
  );
}
