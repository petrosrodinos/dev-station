import { useEffect, useState, type FC } from "react";
import { Info, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { useUpdateNotionPage } from "@/features/integrations/hooks/use-integrations";
import type { NotionPageContent } from "@/features/integrations/interfaces/integrations.interfaces";
import { notionMarkdownToGfm } from "@/lib/notion-markdown";
import { cn } from "@/lib/utils";

interface PageEditorProps {
  connectionId: string;
  page: NotionPageContent;
  onDirtyChange: (dirty: boolean) => void;
  onDone: () => void;
}

/** Edits a Notion page's title and (when it round-trips safely) its markdown body. */
export const PageEditor: FC<PageEditorProps> = ({ connectionId, page, onDirtyChange, onDone }) => {
  const update = useUpdateNotionPage();
  const [title, setTitle] = useState(page.title);
  const [markdown, setMarkdown] = useState(page.markdown);

  const titleChanged = title.trim() !== page.title && title.trim().length > 0;
  const bodyChanged = page.editable && markdown !== page.markdown;
  const dirty = titleChanged || bodyChanged;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const save = () => {
    if (!dirty || update.isPending) return;
    update.mutate(
      {
        connectionId,
        pageId: page.id,
        ...(titleChanged && { title: title.trim() }),
        ...(bodyChanged && { markdown }),
      },
      {
        onSuccess: onDone,
      },
    );
  };

  return (
    <div
      className="flex h-[65vh] min-h-0 flex-col gap-3 p-4"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape" && !dirty) onDone();
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" aria-label="Page title" className="h-9 text-base font-semibold" />
      {page.editable ? (
        <MarkdownEditor
          value={markdown}
          onChange={setMarkdown}
          placeholder="Write in markdown…"
          toPreview={notionMarkdownToGfm}
          autoFocus
          className="flex-1"
        />
      ) : (
        <div className="flex items-start gap-2.5 rounded-lg border bg-card px-4 py-3 text-[0.7813rem] text-body">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          This page has blocks that can't be represented as markdown, so only the title can be edited here. Edit the content in Notion.
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[11.5px] text-muted-foreground", dirty && "text-warning")}>{dirty ? "Unsaved changes · Ctrl+S to save" : "No changes"}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={update.isPending}
            onClick={onDone}
          >
            Cancel
          </Button>
          <Button size="sm" className="h-7 gap-1 text-xs" disabled={!dirty} loading={update.isPending} onClick={save}>
            <Save className="size-3.5" /> Save to Notion
          </Button>
        </div>
      </div>
    </div>
  );
};
