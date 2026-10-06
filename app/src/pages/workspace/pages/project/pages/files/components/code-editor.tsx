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
import { useFileContent, useSaveFile } from "@/features/files/hooks/use-files";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { cn } from "@/lib/utils";
import { FileHeader, FileHeaderAction } from "./file-header";
import { getFileDraft, setFileDraft } from "../utils/file-drafts.utils";

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

  // Start from the unsaved draft if this file was edited earlier this session, else from the file on disk.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${projectId}:${path}`;
    if (data !== undefined && loadedFor.current !== key) {
      setDraft(getFileDraft(projectId, path) ?? data.content);
      loadedFor.current = key;
    }
  }, [data, projectId, path]);

  const edit = (content: string) => {
    setDraft(content);
    setFileDraft(projectId, path, content);
  };

  const dirty = draft !== null && data !== undefined && draft !== data.content;

  const doSave = () => {
    if (draft === null || !dirty || save.isPending) return;
    save.mutate({ projectId, path, content: draft });
  };

  const loaded = data !== undefined && draft !== null;
  const actions = loaded ? (
    <>
      <span className={cn("text-[11.5px] text-muted-foreground", dirty && "text-warning")}>{dirty ? "Unsaved changes" : "Saved"}</span>
      {markdownFile &&
        VIEW_MODE_BUTTONS.map(({ id, label, icon: Icon }) => (
          <FileHeaderAction key={id} label={label} active={viewMode === id} onClick={() => setViewMode(id)}>
            <Icon className="size-3.5" />
          </FileHeaderAction>
        ))}
      <Button size="sm" variant="outline" className="h-6 gap-1.5 px-2 text-xs" disabled={!dirty || save.isPending} onClick={doSave}>
        {save.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
        Save
      </Button>
    </>
  ) : undefined;

  let body;
  if (isPending) body = <ListSkeleton rows={10} withIcon={false} />;
  else if (isError) body = <EmptyState title="Can't edit this file" description={error.message} />;
  else if (draft !== null) {
    body = (
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
              onChange={edit}
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
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FileHeader path={path} actions={actions} />
      {body}
    </div>
  );
}
