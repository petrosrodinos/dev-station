import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { normalizePreviewUrl } from "@/features/preview/utils/preview-url.utils";

interface PreviewAddressInputProps {
  /** The page the preview is showing now; shown whenever the field is not being edited. */
  currentUrl: string;
  onNavigate: (url: string) => void;
}

/** Editable address bar for the preview. Enter navigates, Escape reverts; typing a port alone (e.g. "5173") is enough. */
export function PreviewAddressInput({ currentUrl, onNavigate }: PreviewAddressInputProps) {
  // null = not editing, so the field follows the page (in-page links update it).
  const [draft, setDraft] = useState<string | null>(null);

  const finish = (target: HTMLInputElement) => {
    setDraft(null);
    target.blur();
  };

  return (
    <Input
      aria-label="Preview address"
      value={draft ?? currentUrl}
      placeholder="localhost:3000"
      spellCheck={false}
      className="h-7 min-w-0 flex-1 px-2 font-mono text-xs"
      onFocus={(e) => {
        setDraft(currentUrl);
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") finish(e.currentTarget);
        if (e.key !== "Enter") return;
        const next = normalizePreviewUrl(draft ?? currentUrl);
        if (!next) {
          toast({ title: "Only localhost URLs can be previewed", description: "Use localhost, 127.0.0.1, or just a port.", variant: "error", duration: 4000 });
          return;
        }
        onNavigate(next);
        finish(e.currentTarget);
      }}
    />
  );
}
