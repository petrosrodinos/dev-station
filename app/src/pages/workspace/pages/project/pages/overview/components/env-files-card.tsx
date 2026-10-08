import { useCallback, useState } from "react";
import { ExternalLink, FileKey2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project } from "@/features/projects/interfaces/projects.interfaces";
import { useProjectEnvConsent } from "@/features/projects/hooks/use-projects";
import { useEnvFiles } from "@/features/env-files/hooks/use-env-files";
import { useOpenInEditor } from "@/features/files/hooks/use-files";
import { EditorTargets, type EnvFileSummary } from "@shared/contract";
import { EnvAccessConsentDialog } from "./env-access-consent-dialog";
import { EnvFileEditor } from "./env-file-editor";

/** All `.env*` files of the project (root and service folders), editable as key/value pairs. Desktop only. */
export function EnvFilesCard({ project }: { project: Project }) {
  const consent = useProjectEnvConsent(project.id);
  const allowed = consent.data?.accepted === true;
  const files = useEnvFiles(project.id, allowed);
  const openInEditor = useOpenInEditor();
  const [consentOpen, setConsentOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  const list = files.data ?? [];
  // Default to the first real (non-template) file; templates are documentation.
  const selected = list.find((f) => f.path === selectedPath) ?? list.find((f) => !f.is_template) ?? list[0] ?? null;
  const groups = list.reduce<Map<string, EnvFileSummary[]>>((acc, f) => acc.set(f.dir, [...(acc.get(f.dir) ?? []), f]), new Map());

  const choose = (path: string) => {
    if (path === selected?.path) return;
    if (dirty) setPendingPath(path);
    else setSelectedPath(path);
  };

  return (
    <Panel className="@4xl:col-span-2">
      <PanelHeader
        title={
          <>
            <FileKey2 className="size-4 text-muted-foreground" /> Environment files
            {allowed && list.length > 0 && <span className="text-xs font-normal text-muted-foreground">{list.length}</span>}
          </>
        }
        actions={
          allowed &&
          selected && (
            <>
              <Select value={selected.path} onValueChange={(v) => v && choose(String(v))}>
                <SelectTrigger aria-label="Environment file" className="h-8 min-w-56 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...groups].map(([dir, items]) => (
                    <SelectGroup key={dir}>
                      <SelectLabel>{dir === "." ? "Project root" : dir}</SelectLabel>
                      {items.map((f) => (
                        <SelectItem key={f.path} value={f.path} className="font-mono text-xs">
                          {f.path}
                          {f.is_template && <span className="ml-2 font-sans text-[0.6875rem] text-muted-foreground">template</span>}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground"
                onClick={() => openInEditor.mutate({ projectId: project.id, editor: EditorTargets.DEFAULT, path: selected.path })}
              >
                <ExternalLink className="size-3.5" /> Open
              </Button>
            </>
          )
        }
      />

      {consent.isPending || (allowed && files.isPending) ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : !allowed ? (
        <EmptyState
          icon={<FileKey2 />}
          title="View and edit this project's .env files"
          description="Dev Station reads them on this computer only. Nothing from these files is sent to our servers."
          action={
            <Button size="sm" onClick={() => setConsentOpen(true)}>
              Allow access
            </Button>
          }
        />
      ) : files.isError ? (
        <div className="px-4 py-6 text-center text-[0.8125rem] text-muted-foreground">{files.error.message}</div>
      ) : !selected ? (
        <EmptyState icon={<FileKey2 />} title="No .env files found" description="Files named .env or .env.* in the project root and service folders show up here." />
      ) : (
        <>
          {selected.is_template && (
            <div className="border-b bg-muted/40 px-4 py-2 text-[0.7188rem] text-muted-foreground">
              This is a template: apps don't load it. It documents the variables other .env files should define.
            </div>
          )}
          <EnvFileEditor key={selected.path} projectId={project.id} file={selected} onDirtyChange={onDirtyChange} />
        </>
      )}

      <EnvAccessConsentDialog projectId={project.id} projectName={project.name} open={consentOpen} onOpenChange={setConsentOpen} onAccepted={() => files.refetch()} />
      <ConfirmationDialog
        isOpen={!!pendingPath}
        onClose={() => setPendingPath(null)}
        title="Discard unsaved changes?"
        description={`Your edits to ${selected?.path ?? "this file"} have not been saved.`}
        confirmText="Discard"
        variant="destructive"
        onConfirm={() => {
          setSelectedPath(pendingPath);
          setPendingPath(null);
          setDirty(false);
        }}
      />
    </Panel>
  );
}
