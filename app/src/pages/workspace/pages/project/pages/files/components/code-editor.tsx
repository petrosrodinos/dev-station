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
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useFileContent, useSaveFile } from "@/features/files/hooks/use-files";
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

function languageFor(path: string): Extension[] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const factory = EXT_LANGUAGE[ext];
  return factory ? [factory()] : [];
}

/** Follows the resolved <html> theme class rather than the raw setting, so it stays correct for "system" and for changes made elsewhere (e.g. Settings). */
function useResolvedTheme(): "light" | "dark" {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark ? "dark" : "light";
}

/** In-app viewer/editor for text files, backed by the local filesystem bridge (Spec §11). */
export function CodeEditor({ projectId, path }: { projectId: string; path: string }) {
  const { data, isPending, isError, error } = useFileContent(projectId, path);
  const save = useSaveFile();
  const [draft, setDraft] = useState<string | null>(null);
  const theme = useResolvedTheme();
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
        <Button size="sm" variant="outline" className="h-6 gap-1.5 px-2 text-xs" disabled={!dirty || save.isPending} onClick={doSave}>
          {save.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          Save
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            doSave();
          }
        }}
      >
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
    </div>
  );
}
