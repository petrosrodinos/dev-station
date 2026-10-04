import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { Columns2, Eye, Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileContent, useSaveFile } from "@/features/files/hooks/use-files";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { cn } from "@/lib/utils";

const EXT_LANGUAGE: Record<string, () => Extension> = {
  js: javascript, jsx: () => javascript({ jsx: true }), mjs: javascript, cjs: javascript,
  ts: () => javascript({ typescript: true }), tsx: () => javascript({ typescript: true, jsx: true }),
  json: json, css: css, scss: css, less: css,
  html: html, htm: html,
  md: markdown, mdx: markdown,
  py: python,
  yml: yaml, yaml: yaml,
};

const MARKDOWN_EXTENSIONS = new Set(["md", "mdx", "markdown"]);
const isMarkdown = (path: string) => MARKDOWN_EXTENSIONS.has(path.split(".").pop()?.toLowerCase() ?? "");

const ViewModes = { EDIT: "edit", SPLIT: "split", PREVIEW: "preview" } as const;
type ViewMode = (typeof ViewModes)[keyof typeof ViewModes];

const VIEW_MODE_BUTTONS: { id: ViewMode; label: string; icon: typeof Pencil }[] = [
  { id: ViewModes.EDIT, label: "Editor", icon: Pencil },
  { id: ViewModes.SPLIT, label: "Side by side", icon: Columns2 },
  { id: ViewModes.PREVIEW, label: "Preview (Ctrl+Shift+V)", icon: Eye },
];

function languageFor(path: string): Extension[] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const factory = EXT_LANGUAGE[ext];
  return factory ? [factory()] : [];
}

/** In-app viewer/editor for text files, backed by the local filesystem bridge (Spec §11). */
export function CodeEditor({ projectId, path }: { projectId: string; path: string }) {
  const { data, isPending, isError, error } = useFileContent(projectId, path);
  const save = useSaveFile();
  const [draft, setDraft] = useState<string | null>(null);
  const theme = useResolvedTheme();
  const markdownFile = isMarkdown(path);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewModes.EDIT);
  const showEditor = !markdownFile || viewMode !== ViewModes.PREVIEW;
  const showPreview = markdownFile && viewMode !== ViewModes.EDIT;
  const extensions = useMemo(() => languageFor(path), [path]);

  // Reset the draft whenever the selected file changes or its on-disk content is (re)loaded.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${projectId}:${path}`;
    if (data !== undefined && loadedFor.current !== key) {
      setDraft(data.content);
      loadedFor.current = key;
    }
  }, [data, projectId, path]);

  const dirty = draft !== null && data !== undefined && draft !== data.content;

  const doSave = () => {
    if (draft === null || !dirty || save.isPending) return;
    save.mutate({ projectId, path, content: draft });
  };

  if (isPending) return <ListSkeleton rows={10} withIcon={false} />;
  if (isError) return <EmptyState title="Can't edit this file" description={error.message} />;
  if (draft === null) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <span className={cn("text-[11.5px] text-muted-foreground", dirty && "text-warning")}>{dirty ? "Unsaved changes" : "Saved"}</span>
        {markdownFile && (
          <div className="ml-auto flex items-center gap-0.5">
            {VIEW_MODE_BUTTONS.map(({ id, label, icon: Icon }) => (
              <Tooltip key={id}>
                <TooltipTrigger
                  render={
                    <Button variant="ghost" size="icon" className={cn("size-6 text-muted-foreground", viewMode === id && "bg-accent text-foreground")} aria-label={label} aria-pressed={viewMode === id} onClick={() => setViewMode(id)}>
                      <Icon className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        <Button size="sm" variant="outline" className="h-6 gap-1.5 px-2 text-xs" disabled={!dirty || save.isPending} onClick={doSave}>
          {save.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          Save
        </Button>
      </div>
      <div
        className="flex min-h-0 flex-1"
        onKeyDown={(e) => {
          if (markdownFile && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
            e.preventDefault();
            setViewMode((m) => (m === ViewModes.PREVIEW ? ViewModes.EDIT : ViewModes.PREVIEW));
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            doSave();
          }
        }}
      >
        {showEditor && (
          <div className={cn("min-h-0 min-w-0 overflow-auto", showPreview ? "w-1/2 border-r" : "flex-1")}>
            <CodeMirror
              value={draft}
              onChange={setDraft}
              extensions={extensions}
              theme={theme === "light" ? githubLight : githubDark}
              height="100%"
              basicSetup={{ foldGutter: true, highlightActiveLine: true }}
              className="h-full text-[13px]"
            />
          </div>
        )}
        {showPreview && (
          <div className={cn("min-h-0 min-w-0 overflow-auto p-4", showEditor ? "w-1/2" : "flex-1")}>
            {draft.trim() ? <MarkdownPreview markdown={draft} /> : <span className="text-[0.8125rem] text-ash">Nothing to preview.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
