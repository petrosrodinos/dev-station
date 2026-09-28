import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GitCommitHorizontal } from "lucide-react";
import { Panel, PanelBody } from "@/components/ui/panel";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useGitCommit, useGitPush } from "@/features/git/hooks/use-git";
import { useGitIdentities } from "@/features/git-identities/hooks/use-git-identities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentSessions, useRenameAgentSession } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { commitSchema, type CommitFormData } from "../../../validation-schemas/project.schema";

/** Commit is always an explicit developer action — AI changes are never auto-committed (Spec §17). */
export function CommitBox({ project, selectedPaths, totalFiles }: { project: Project; selectedPaths: string[]; totalFiles: number }) {
  const commit = useGitCommit();
  const push = useGitPush();
  const { data: identities } = useGitIdentities();
  const [identityId, setIdentityId] = useState<string | null>(null);
  const identity = identities?.find((i) => i.id === identityId) ?? identities?.find((i) => i.is_default);
  const { data: sessions } = useAgentSessions({ project_id: project.id });
  const linkCommit = useRenameAgentSession();
  const { can } = usePermissions();
  const form = useForm<CommitFormData>({ resolver: zodResolver(commitSchema), defaultValues: { message: "" } });

  const submit = (andPush: boolean) =>
    form.handleSubmit((data) =>
      commit.mutate(
        {
          projectId: project.id,
          message: data.message,
          paths: selectedPaths.length === totalFiles ? undefined : selectedPaths,
          name: identity?.name,
          email: identity?.email,
        },
        {
          onSuccess: (result) => {
            form.reset({ message: "" });
            // Attach the commit to the most recent AI session that produced uncommitted changes.
            const session = sessions?.data.find((s) => s.files_changed > 0 && !s.commit_sha);
            if (session) linkCommit.mutate({ id: session.id, commit_sha: result.sha });
            if (andPush) push.mutate({ projectId: project.id });
          },
        },
      ),
    )();

  const count = selectedPaths.length;

  return (
    <Panel>
      <PanelBody>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Commit message"
                      className="font-mono text-[0.7813rem]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void submit(false);
                        }
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-xs text-ash max-sm:hidden">Ctrl+Enter to commit</span>
              {identities && identities.length > 1 && identity && (
                <Select value={identity.id} onValueChange={setIdentityId}>
                  <SelectTrigger className="h-9 w-44 max-w-full text-xs" aria-label="Commit as">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {identities.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.label} · {i.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {can(PermissionKeys.GIT_PUSH) && (
                <Button type="button" variant="outline" disabled={!count || commit.isPending} loading={push.isPending} onClick={() => void submit(true)}>
                  Commit & push
                </Button>
              )}
              <Button type="submit" disabled={!count} loading={commit.isPending} className="gap-1.5">
                {!commit.isPending && <GitCommitHorizontal className="size-4" />} Commit {count} file{count === 1 ? "" : "s"}
              </Button>
            </div>
          </form>
        </Form>
      </PanelBody>
    </Panel>
  );
}
