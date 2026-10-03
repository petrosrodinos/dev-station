import type { FC } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const PROSE = cn(
  "min-w-0 break-words text-[0.8125rem] leading-relaxed text-body",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-ink",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-ink",
  "[&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:font-semibold [&_h4]:text-ink",
  "[&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-ink",
  "[&_a]:text-info [&_a]:underline-offset-2 hover:[&_a]:underline",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
  "[&_li:has(>input)]:list-none [&_li>input]:mr-1.5 [&_li>input]:align-middle",
  "[&_blockquote]:my-3 [&_blockquote]:rounded-md [&_blockquote]:border-l-2 [&_blockquote]:border-hairline-strong [&_blockquote]:bg-surface-elevated [&_blockquote]:px-3 [&_blockquote]:py-1",
  "[&_code]:rounded [&_code]:bg-surface-card [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.75rem]",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-surface-elevated [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_hr]:my-4 [&_hr]:border-border",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:bg-surface-elevated [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:px-2 [&_td]:py-1",
  "[&_img]:max-w-full [&_img]:rounded-md",
);

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

/** Read-only GitHub-flavored markdown renderer. Raw HTML is not rendered. */
export const MarkdownPreview: FC<MarkdownPreviewProps> = ({ markdown, className }) => (
  <div className={cn(PROSE, className)}>
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {markdown}
    </Markdown>
  </div>
);
