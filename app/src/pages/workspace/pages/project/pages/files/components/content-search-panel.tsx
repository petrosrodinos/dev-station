import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CaseSensitive, ChevronRight, Ellipsis, FileText, Regex, ReplaceAll, WholeWord, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useContentSearch, useReplaceContent } from "@/features/files/hooks/use-files";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ContentMatch, ContentSearchOptions } from "@shared/contract";
import { hasFileDraft } from "../utils/file-drafts.utils";

interface ContentSearchPanelProps {
  projectId: string;
  /** Bumped by the parent (Ctrl+Shift+F) to focus the query box. */
  focusNonce: number;
  /** Set by the right-click menu in the folder tree: narrow the search to, or away from, a path. */
  scopeRequest: { include?: string; exclude?: string; nonce: number } | null;
  activePath: string | null;
  onOpenMatch: (path: string, match: ContentMatch) => void;
  /** Called with the files a replace actually rewrote, so open editors can reload them. */
  onReplaced: (paths: string[]) => void;
}

/** VS Code-style "Find in Files": search text inside project files, with regex / case / whole-word, globs, and replace. */
export function ContentSearchPanel({ projectId, focusNonce, scopeRequest, activePath, onOpenMatch, onReplaced }: ContentSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queryRef.current?.focus();
    queryRef.current?.select();
  }, [focusNonce]);

  useEffect(() => {
    if (!scopeRequest) return;
    if (scopeRequest.include !== undefined) setInclude(scopeRequest.include);
    if (scopeRequest.exclude !== undefined) setExclude((current) => [current.trim(), scopeRequest.exclude].filter(Boolean).join(", "));
    setShowFilters(true);
  }, [scopeRequest]);

  const options = useMemo<ContentSearchOptions>(() => ({ query, regex, caseSensitive, wholeWord, include, exclude }), [query, regex, caseSensitive, wholeWord, include, exclude]);
  const debounced = useDebouncedValue(options, 300);
  const { data, isFetching, isError, error } = useContentSearch(projectId, debounced);
  const replace = useReplaceContent();

  // A new search starts with every file listed again.
  useEffect(() => setDismissed(new Set()), [debounced]);

  const files = useMemo(() => (data?.files ?? []).filter((f) => !dismissed.has(f.path)), [data, dismissed]);
  const matchCount = files.reduce((n, f) => n + f.matches.length, 0);
  // Files with unsaved edits are never rewritten behind the editor's back.
  const replaceable = files.filter((f) => !hasFileDraft(projectId, f.path));
  const skipped = files.length - replaceable.length;
  const settled = debounced === options && !!query;

  const doReplace = () => {
    const paths = replaceable.map((f) => f.path);
    replace.mutate(
      { projectId, options: debounced, replacement, paths },
      {
        onSuccess: (result) => {
          setConfirming(false);
          onReplaced(paths);
          toast({
            title: `Replaced ${result.replacements} occurrence${result.replacements === 1 ? "" : "s"} in ${result.filesChanged} file${result.filesChanged === 1 ? "" : "s"}`,
            description: skipped ? `${skipped} file${skipped === 1 ? "" : "s"} with unsaved changes skipped.` : undefined,
            duration: 2500,
          });
        },
      },
    );
  };

  const toggle = (set: Set<string>, path: string) => {
    const next = new Set(set);
    if (!next.delete(path)) next.add(path);
    return next;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 pt-1">
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="mt-0.5 size-5 shrink-0 self-start text-muted-foreground" aria-label="Toggle replace" aria-expanded={showReplace} onClick={() => setShowReplace((v) => !v)}>
          <ChevronRight className={cn("size-3.5 transition-transform", showReplace && "rotate-90")} />
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="relative">
            <Input
              ref={queryRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in files"
              aria-label="Search in files"
              aria-invalid={isError || undefined}
              className="h-8 pr-[5.25rem]"
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5">
              <OptionToggle label="Match case" active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)}>
                <CaseSensitive className="size-3.5" />
              </OptionToggle>
              <OptionToggle label="Match whole word" active={wholeWord} onClick={() => setWholeWord((v) => !v)}>
                <WholeWord className="size-3.5" />
              </OptionToggle>
              <OptionToggle label="Use regular expression" active={regex} onClick={() => setRegex((v) => !v)}>
                <Regex className="size-3.5" />
              </OptionToggle>
            </div>
          </div>
          {showReplace && (
            <div className="flex gap-1">
              <Input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Replace" aria-label="Replace with" className="h-8 min-w-0 flex-1" />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="outline" size="icon" className="size-8 shrink-0" aria-label="Replace all" disabled={!settled || !replaceable.length || replace.isPending} onClick={() => setConfirming(true)}>
                      <ReplaceAll className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent>Replace all</TooltipContent>
              </Tooltip>
            </div>
          )}
          <button type="button" className="flex items-center gap-1 text-[0.6875rem] text-ash hover:text-foreground" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
            <Ellipsis className="size-3.5" /> files to include / exclude
          </button>
          {showFilters && (
            <div className="space-y-1">
              <Input value={include} onChange={(e) => setInclude(e.target.value)} placeholder="files to include (e.g. src/**, *.tsx)" aria-label="Files to include" className="h-7 text-xs" />
              <Input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="files to exclude (e.g. **/*.test.ts)" aria-label="Files to exclude" className="h-7 text-xs" />
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!query ? (
          <EmptyState icon={<FileText />} title="Search inside files" description="Type to search file contents. node_modules, build output and binary files are skipped." />
        ) : isError ? (
          <div className="px-2 py-1 text-xs text-danger">{error.message}</div>
        ) : !data && isFetching ? (
          <ListSkeleton rows={6} />
        ) : !files.length ? (
          <EmptyState title="No results" description={`Nothing in the files matched “${debounced.query}”.`} />
        ) : (
          <>
            <div className="px-2 pb-1 text-[0.6875rem] text-ash" aria-live="polite">
              {matchCount}
              {data?.truncated ? "+" : ""} result{matchCount === 1 ? "" : "s"} in {files.length} file{files.length === 1 ? "" : "s"}
              {isFetching && " · searching…"}
            </div>
            {files.map((file) => {
              const open = !collapsed.has(file.path);
              const slash = file.path.lastIndexOf("/");
              return (
                <div key={file.path}>
                  <div className="group flex h-[26px] cursor-pointer items-center gap-1 rounded-sm pr-1 text-[0.8125rem] hover:bg-surface-elevated" onClick={() => setCollapsed((c) => toggle(c, file.path))}>
                    <ChevronRight className={cn("size-3.5 shrink-0 text-ash transition-transform", open && "rotate-90")} />
                    <span className={cn("truncate font-medium", activePath === file.path && "text-primary")}>{file.path.slice(slash + 1)}</span>
                    <span className="truncate text-xs text-ash">{file.path.slice(0, Math.max(slash, 0))}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Dismiss ${file.path}`}
                        className="hidden size-4 items-center justify-center rounded-xs text-ash hover:bg-surface-card hover:text-foreground group-hover:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissed((d) => toggle(d, file.path));
                        }}
                      >
                        <X className="size-3" />
                      </button>
                      <span className="rounded-full bg-surface-card px-1.5 text-[0.6875rem] text-muted-foreground">{file.matches.length}</span>
                    </span>
                  </div>
                  {open &&
                    file.matches.map((m, i) => (
                      <MatchRow key={`${m.line}:${m.column}:${i}`} match={m} regex={debounced.regex} replacement={showReplace ? replacement : null} onClick={() => onOpenMatch(file.path, m)} />
                    ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={(o) => !replace.isPending && setConfirming(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace in {replaceable.length} file{replaceable.length === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              Every match of “{debounced.query}” will be replaced with {replacement ? `“${replacement}”` : "nothing"}. Files are saved straight to disk.
              {skipped > 0 && ` ${skipped} file${skipped === 1 ? " has" : "s have"} unsaved changes in the editor and will be skipped.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={replace.isPending}>
              Cancel
            </Button>
            <Button loading={replace.isPending} onClick={doReplace}>
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OptionToggle({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon" className={cn("size-5 text-muted-foreground", active && "bg-accent text-foreground")} aria-label={label} aria-pressed={active} onClick={onClick}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MatchRow({ match, regex, replacement, onClick }: { match: ContentMatch; regex: boolean; replacement: string | null; onClick: () => void }) {
  const before = match.preview.slice(0, match.previewStart);
  const hit = match.preview.slice(match.previewStart, match.previewStart + match.length);
  const after = match.preview.slice(match.previewStart + match.length);
  // A literal replace can be previewed exactly; a regex replace depends on capture groups, so only the match is marked.
  const showReplacement = replacement !== null && replacement !== "" && !regex;
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()} title={`Line ${match.line}`} className="flex h-[22px] cursor-pointer items-center gap-1 whitespace-pre rounded-sm pl-6 pr-1 font-mono text-xs text-body hover:bg-surface-elevated">
      <span className="truncate">
        {before}
        <mark className={cn("rounded-xs bg-warning/30 text-foreground", showReplacement && "line-through opacity-70")}>{hit}</mark>
        {showReplacement && <mark className="rounded-xs bg-success/30 text-foreground">{replacement}</mark>}
        {after}
      </span>
    </div>
  );
}
