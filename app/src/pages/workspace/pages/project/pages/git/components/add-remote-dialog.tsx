import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus2, Link2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useGitPublishToRemote, type PublishTarget } from "@/features/git/hooks/use-git";
import { useProviderConnections } from "@/features/integrations/hooks/use-integrations";
import { IntegrationProviders, type GithubRepository } from "@/features/integrations/interfaces/integrations.interfaces";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { GithubRepoPicker } from "@/pages/workspace/components/project-form/github-repo-picker";
import { Routes } from "@/routes/routes";
import { remoteSchema, RemoteModes, type RemoteFormData, type RemoteMode } from "../../../validation-schemas/project.schema";

const slugify = (value: string) =>
  value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

/** Gives a repository that has no remote one: create a GitHub repo through a connected account, pick an existing one, or paste a URL. */
export function AddRemoteDialog({
  project,
  branch,
  hasCommits,
  open,
  onOpenChange,
}: {
  project: Project;
  /** Current branch; null when detached. */
  branch: string | null;
  hasCommits: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const publish = useGitPublishToRemote();
  const { connections } = useProviderConnections(IntegrationProviders.GITHUB);
  const [existing, setExisting] = useState<GithubRepository | null>(null);
  const defaultMode: RemoteMode = connections.length ? RemoteModes.CREATE : RemoteModes.URL;

  const form = useForm<RemoteFormData>({ resolver: zodResolver(remoteSchema), defaultValues: { mode: defaultMode, is_private: true } });
  const mode = form.watch("mode");

  useEffect(() => {
    if (!open) return;
    setExisting(null);
    form.reset({
      mode: defaultMode,
      connection_id: project.github_connection_id ?? connections[0]?.id,
      name: slugify(project.name),
      description: "",
      owner: "",
      is_private: true,
      url: "",
      // A fresh `git init` often yields `master`; suggest `main` since the remote is about to be created with this name.
      branch_name: branch === "master" ? "main" : (branch ?? ""),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Accounts load asynchronously: pick one as soon as they arrive instead of leaving the field empty.
  useEffect(() => {
    if (open && connections.length && !form.getValues("connection_id")) form.setValue("connection_id", connections[0].id);
  }, [open, connections, form]);

  const onSubmit = (data: RemoteFormData) => {
    let target: PublishTarget;
    if (data.mode === RemoteModes.URL) target = { type: "url", url: data.url! };
    else if (data.mode === RemoteModes.EXISTING) target = { type: "existing", connectionId: data.connection_id!, repo: existing! };
    else target = { type: "create", connectionId: data.connection_id!, repo: { name: data.name!, description: data.description || undefined, private: data.is_private, owner: data.owner || undefined } };
    const rename = branch && data.branch_name ? { from: branch, to: data.branch_name } : undefined;
    publish.mutate({ projectId: project.id, project, target, hasCommits, rename }, { onSuccess: () => onOpenChange(false) });
  };

  const accountField = (
    <FormField
      control={form.control}
      name="connection_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>GitHub account</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {connections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                  {c.external_account ? ` (${c.external_account})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !publish.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a remote</DialogTitle>
          <DialogDescription>
            This repository has nowhere to push to yet. {hasCommits ? "The current branch is published once the remote is added." : "Commit your changes, then push."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-4">
            <Tabs value={mode} onValueChange={(v) => form.setValue("mode", v as RemoteMode, { shouldValidate: form.formState.isSubmitted })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value={RemoteModes.CREATE} disabled={!connections.length} className="gap-1.5 text-xs">
                  <FilePlus2 className="size-3.5" /> New repository
                </TabsTrigger>
                <TabsTrigger value={RemoteModes.EXISTING} disabled={!connections.length} className="gap-1.5 text-xs">
                  <Search className="size-3.5" /> Existing
                </TabsTrigger>
                <TabsTrigger value={RemoteModes.URL} className="gap-1.5 text-xs">
                  <Link2 className="size-3.5" /> URL
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {!connections.length && (
              <div className="rounded-md border border-dashed p-3 text-center text-[0.8125rem] text-muted-foreground">
                No GitHub account is connected.{" "}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(Routes.workspace.integrations);
                  }}
                >
                  Connect one in Integrations
                </button>{" "}
                to create or pick a repository, or paste a URL.
              </div>
            )}

            {mode === RemoteModes.CREATE && (
              <>
                {accountField}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository name</FormLabel>
                      <FormControl>
                        <Input className="font-mono" autoFocus {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to create it under your own account" className="font-mono" {...field} value={field.value ?? ""} />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                      </FormControl>
                      <FormLabel className="font-normal">Private repository</FormLabel>
                    </FormItem>
                  )}
                />
              </>
            )}

            {mode === RemoteModes.EXISTING && (
              <>
                {accountField}
                <FormField
                  control={form.control}
                  name="existing_full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository</FormLabel>
                      <GithubRepoPicker
                        connectionId={form.watch("connection_id") ?? null}
                        selected={field.value}
                        onSelect={(repo) => {
                          setExisting(repo);
                          field.onChange(repo.full_name);
                        }}
                      />
                      <FormDescription>Its history is not merged — pushing fails if it already has commits this branch doesn't contain.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {mode === RemoteModes.URL && (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/company/project.git" className="font-mono text-[0.7813rem]" autoFocus {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>Pushed with your local Git credentials (credential manager or SSH keys).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {branch && (
              <FormField
                control={form.control}
                name="branch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch name</FormLabel>
                    <FormControl>
                      <Input className="font-mono" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>
                      {branch === field.value ? `Publishes the current branch, ${branch}.` : `Renames ${branch} to ${field.value || "…"} before publishing (git branch -m).`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={publish.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={publish.isPending}>
                {mode === RemoteModes.CREATE ? "Create & add remote" : "Add remote"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
