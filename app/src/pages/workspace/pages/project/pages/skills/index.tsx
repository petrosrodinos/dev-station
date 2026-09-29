import { useMemo, useState, type FC } from "react";
import { BookOpen, Copy, FolderCog, MoreHorizontal, Plus, RefreshCw, Save, Search, Send, Star } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { useCustomSkills, useDeleteSkill, useFavoriteSkill, useSkill, useSkills, useUnfavoriteSkill } from "@/features/skills/hooks/use-skills";
import type { UnifiedSkill } from "@/features/skills/interfaces/skills.interfaces";
import { SkillKindOptions, SkillProviderFilterOptions, SkillProviderOptions, SkillScopeOptions } from "@/config/constants/dropdowns/skills/skill.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { isDesktop } from "@/lib/desktop";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SkillProvider } from "@shared/contract";
import type { SkillFormData } from "./validation-schemas/skill.schema";
import { useProjectContext } from "../../hooks/use-project-context";
import { SkillDialog } from "./components/skill-dialog";
import { SkillFoldersDialog } from "./components/skill-folders-dialog";
import { SkillSendDialog } from "./components/skill-send-dialog";

/** Every agent skill readable on this device (all provider formats) plus custom skills shared with
 * (or kept private within) the organization — viewable, sendable, and for custom ones, editable. */
const SkillsTab: FC = () => {
  const project = useProjectContext();
  const { data, isPending, isFetching, refetch, error } = useSkills(project.id);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<SkillProvider | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [skillDialog, setSkillDialog] = useState<{ editId: string | null; initialValues?: Partial<SkillFormData> } | null>(null);
  const [removing, setRemoving] = useState<UnifiedSkill | null>(null);

  const favorite = useFavoriteSkill();
  const unfavorite = useUnfavoriteSkill();
  const deleteSkill = useDeleteSkill();
  const { data: customSkills } = useCustomSkills();
  const editingSkill = skillDialog?.editId ? (customSkills?.find((c) => c.id === skillDialog.editId) ?? null) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.skills ?? []).filter((s) => (provider === "all" || s.provider === provider) && (!q || `${s.name} ${s.description}`.toLowerCase().includes(q)));
  }, [data, query, provider]);

  const selectedSummary = filtered.find((s) => s.id === selectedId) ?? null;
  const isCustomSelected = selectedSummary?.source === "custom";
  const { data: systemDetail, isPending: systemDetailPending } = useSkill(!isCustomSelected ? (selectedSummary?.id ?? null) : null);
  // Custom skills already carry their full body from the list query — no extra fetch needed.
  const detail = isCustomSelected && selectedSummary ? { ...selectedSummary, body: selectedSummary.body ?? "", truncated: false } : systemDetail;
  const detailPending = isCustomSelected ? false : systemDetailPending;

  if (!isDesktop()) {
    return <EmptyState icon={<BookOpen />} title="Desktop only" description="Skills are read from files on this device, so this view is available in the Dev Station desktop app." />;
  }

  const copy = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.body);
      toast({ title: "Copied", duration: 1200 });
    } catch {
      toast({ title: "Could not copy", variant: "error" });
    }
  };

  const toggleFavorite = (skill: UnifiedSkill) => {
    if (skill.favorite_id) unfavorite.mutate(skill.favorite_id);
    else favorite.mutate({ target_kind: skill.source, ref_id: skill.id });
  };

  const saveAsCustom = (skill: UnifiedSkill, body: string) => {
    setSkillDialog({ editId: null, initialValues: { name: `${skill.name} (copy)`, description: skill.description, body, provider: skill.provider, kind: skill.kind, is_public: true } });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-4 @3xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Panel className="flex min-h-0 flex-col overflow-hidden">
        <PanelHeader
          title="Skills"
          actions={
            <>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Rescan skills" onClick={() => refetch()}>
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Manage skill folders" onClick={() => setFoldersOpen(true)}>
                <FolderCog className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-7" aria-label="New skill" onClick={() => setSkillDialog({ editId: null })}>
                <Plus className="size-3.5" />
              </Button>
            </>
          }
        />
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills" aria-label="Search skills" className="h-8 pl-8" />
          </div>
          <Select value={provider} onValueChange={(v) => setProvider(v as SkillProvider | "all")}>
            <SelectTrigger className="h-8" aria-label="Filter by provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SkillProviderFilterOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <ListSkeleton rows={8} />
          ) : error ? (
            <EmptyState title="Could not read skills" description={error.message} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title={data?.skills.length ? "No matches" : "No skills found"}
              description={data?.skills.length ? "Try a different search or provider." : "Nothing was found in the standard provider folders. Add a folder that holds your skills, or create a custom one."}
              action={
                !data?.skills.length && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setFoldersOpen(true)}>
                      Add a folder
                    </Button>
                    <Button size="sm" onClick={() => setSkillDialog({ editId: null })}>
                      New skill
                    </Button>
                  </div>
                )
              }
            />
          ) : (
            <ul>
              {filtered.map((s) => (
                <li key={s.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={cn("flex w-full flex-col gap-1 border-b border-hairline-soft px-3 py-2 pr-16 text-left hover:bg-surface-elevated", s.id === selectedId && "bg-surface-elevated")}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[0.8125rem] font-medium">{s.name}</span>
                      {s.source === "custom" && (
                        <Badge variant="outline" className="shrink-0 text-[0.65rem]">
                          {s.is_public ? "Shared" : "Private"}
                        </Badge>
                      )}
                      <Badge variant="outline" className="ml-auto shrink-0 text-[0.65rem]">
                        {getDropdownOptionLabel(SkillProviderOptions, s.provider)}
                      </Badge>
                    </span>
                    {s.description && <span className="line-clamp-2 text-xs text-muted-foreground">{s.description}</span>}
                    <span className="text-[0.6875rem] text-ash">
                      {getDropdownOptionLabel(SkillKindOptions, s.kind)} · {getDropdownOptionLabel(SkillScopeOptions, s.scope)}
                    </span>
                  </button>
                  <div className="absolute right-2 top-2 flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={s.is_favorite ? "Unfavorite" : "Favorite"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(s);
                      }}
                    >
                      <Star className={cn("size-3.5", s.is_favorite && "fill-warning text-warning")} />
                    </Button>
                    {s.source === "custom" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-6" aria-label={`Actions for ${s.name}`} onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setSkillDialog({ editId: s.id })}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => setRemoving(s)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel className="flex min-h-0 flex-col overflow-hidden">
        {!selectedSummary ? (
          <EmptyState icon={<BookOpen />} title="Select a skill" description="Read it here, then send it to a running agent session." className="my-auto" />
        ) : (
          <>
            <PanelHeader
              title={<span className="truncate">{selectedSummary.name}</span>}
              actions={
                <>
                  {selectedSummary.source === "system" && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => detail && saveAsCustom(selectedSummary, detail.body)} disabled={!detail}>
                      <Save className="size-3.5" /> Save as custom
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={copy} disabled={!detail}>
                    <Copy className="size-3.5" /> Copy
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => setSending(true)}>
                    <Send className="size-3.5" /> Send to session
                  </Button>
                </>
              }
            />
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{getDropdownOptionLabel(SkillProviderOptions, selectedSummary.provider)}</Badge>
                  <Badge variant="outline">{getDropdownOptionLabel(SkillKindOptions, selectedSummary.kind)}</Badge>
                  <Badge variant="outline">{getDropdownOptionLabel(SkillScopeOptions, selectedSummary.scope)}</Badge>
                  {selectedSummary.source === "custom" && <Badge variant="outline">{selectedSummary.is_public ? "Shared with organization" : "Private"}</Badge>}
                </div>
                {selectedSummary.path && <div className="break-all font-mono">{selectedSummary.path}</div>}
                {Object.entries(selectedSummary.meta)
                  .filter(([k]) => k !== "name" && k !== "description")
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="font-medium text-foreground">{k}:</span> {v}
                    </div>
                  ))}
              </div>
              {selectedSummary.description && <p className="text-[0.8125rem]">{selectedSummary.description}</p>}
              {detailPending ? (
                <ListSkeleton rows={6} />
              ) : (
                <>
                  <pre className="whitespace-pre-wrap break-words rounded-md border bg-surface-elevated p-3 font-mono text-xs leading-relaxed">{detail?.body}</pre>
                  {detail?.truncated && <p className="text-xs text-warning">This file is large; only the first 256 KB is shown and sent.</p>}
                </>
              )}
            </div>
          </>
        )}
      </Panel>

      <SkillFoldersDialog open={foldersOpen} onOpenChange={setFoldersOpen} />
      <SkillSendDialog skill={sending ? selectedSummary : null} projectId={project.id} onOpenChange={setSending} />
      <SkillDialog skill={editingSkill} initialValues={skillDialog?.initialValues} open={!!skillDialog} onOpenChange={(o) => !o && setSkillDialog(null)} />
      <ConfirmationDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          deleteSkill.mutate(removing.id, {
            onSuccess: () => {
              setRemoving(null);
              if (selectedId === removing.id) setSelectedId(null);
            },
          });
        }}
        title={`Delete ${removing?.name ?? "skill"}?`}
        description="This removes the custom skill for everyone who can see it."
        confirmText="Delete skill"
        variant="destructive"
        isLoading={deleteSkill.isPending}
      />
    </div>
  );
};

export default SkillsTab;
