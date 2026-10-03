import { useMemo, useRef, useState, type FC, type ReactNode } from "react";
import CodeMirror, { EditorView, keymap, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { Bold, Code, Eye, Heading2, Italic, Link, List, ListChecks, ListOrdered, Pencil, Quote, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { cn } from "@/lib/utils";

/** Wraps the selection (or a placeholder) with `before`/`after` and selects the wrapped text. */
function wrap(view: EditorView, before: string, after: string, placeholder: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to) || placeholder;
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: from + before.length + selected.length },
  });
  view.focus();
  return true;
}

/** Toggles `prefix` at the start of every line the selection touches. */
function prefixLines(view: EditorView, prefix: string) {
  const { state } = view;
  const { from, to } = state.selection.main;
  const lines = [];
  for (let pos = from; pos <= to; ) {
    const line = state.doc.lineAt(pos);
    lines.push(line);
    pos = line.to + 1;
  }
  const allPrefixed = lines.every((l) => l.text.startsWith(prefix));
  view.dispatch({
    changes: lines.map((l) => (allPrefixed ? { from: l.from, to: l.from + prefix.length, insert: "" } : { from: l.from, insert: prefix })),
  });
  view.focus();
  return true;
}

interface ToolbarAction {
  label: string;
  shortcut?: string;
  icon: ReactNode;
  run: (view: EditorView) => boolean;
}

const bold: ToolbarAction = { label: "Bold", shortcut: "Ctrl+B", icon: <Bold />, run: (v) => wrap(v, "**", "**", "bold") };
const italic: ToolbarAction = { label: "Italic", shortcut: "Ctrl+I", icon: <Italic />, run: (v) => wrap(v, "*", "*", "italic") };
const inlineCode: ToolbarAction = { label: "Inline code", shortcut: "Ctrl+E", icon: <Code />, run: (v) => wrap(v, "`", "`", "code") };
const link: ToolbarAction = { label: "Link", shortcut: "Ctrl+K", icon: <Link />, run: (v) => wrap(v, "[", "](https://)", "link") };

const ACTIONS: ToolbarAction[] = [
  bold,
  italic,
  { label: "Strikethrough", icon: <Strikethrough />, run: (v) => wrap(v, "~~", "~~", "text") },
  inlineCode,
  link,
  { label: "Heading", icon: <Heading2 />, run: (v) => prefixLines(v, "## ") },
  { label: "Bulleted list", icon: <List />, run: (v) => prefixLines(v, "- ") },
  { label: "Numbered list", icon: <ListOrdered />, run: (v) => prefixLines(v, "1. ") },
  { label: "Checklist", icon: <ListChecks />, run: (v) => prefixLines(v, "- [ ] ") },
  { label: "Quote", icon: <Quote />, run: (v) => prefixLines(v, "> ") },
];

const formattingKeymap = keymap.of([
  { key: "Mod-b", run: bold.run },
  { key: "Mod-i", run: italic.run },
  { key: "Mod-e", run: inlineCode.run },
  { key: "Mod-k", run: link.run },
]);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Turns the source into what the preview renders (e.g. flattening a provider's markdown dialect). */
  toPreview?: (markdown: string) => string;
}

/** Markdown source editor with a formatting toolbar and a rendered-preview toggle. */
export const MarkdownEditor: FC<MarkdownEditorProps> = ({ value, onChange, placeholder, autoFocus, className, toPreview }) => {
  const theme = useResolvedTheme();
  const ref = useRef<ReactCodeMirrorRef>(null);
  const [preview, setPreview] = useState(false);
  const extensions = useMemo(() => [markdownLanguage(), EditorView.lineWrapping, formattingKeymap], []);

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border", className)}>
      <div className="flex items-center gap-0.5 border-b bg-surface-elevated px-1.5 py-1">
        {ACTIONS.map((action) => (
          <Tooltip key={action.label}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground [&_svg]:size-3.5"
                  aria-label={action.label}
                  disabled={preview}
                  onClick={() => ref.current?.view && action.run(ref.current.view)}
                >
                  {action.icon}
                </Button>
              }
            />
            <TooltipContent>
              {action.label}
              {action.shortcut && <span className="ml-1.5 text-ash">{action.shortcut}</span>}
            </TooltipContent>
          </Tooltip>
        ))}
        <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 gap-1 px-2 text-xs" onClick={() => setPreview((p) => !p)}>
          {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />}
          {preview ? "Write" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {value.trim() ? <MarkdownPreview markdown={toPreview ? toPreview(value) : value} /> : <span className="text-[0.8125rem] text-ash">Nothing to preview.</span>}
        </div>
      ) : (
        <CodeMirror
          ref={ref}
          value={value}
          onChange={onChange}
          extensions={extensions}
          theme={theme === "light" ? githubLight : githubDark}
          placeholder={placeholder}
          autoFocus={autoFocus}
          height="100%"
          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
          className="min-h-0 flex-1 overflow-auto text-[13px] [&_.cm-content]:px-2 [&_.cm-content]:py-3"
        />
      )}
    </div>
  );
};
