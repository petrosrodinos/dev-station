/**
 * Notion returns "Notion-flavored" markdown: plain markdown plus XML-ish blocks (`<callout>`, `<details>`,
 * `<empty-block/>`, mentions…) whose children are tab-indented. This flattens it to GFM for display only —
 * the original string is what gets edited and saved.
 */

const BLOCK_TAG = /^<(\/?)([a-z][a-z0-9-]*)((?:\s+[a-z-]+="[^"]*")*)\s*(\/?)>$/i;
const QUOTE_TAGS = new Set(["callout", "quote"]);

const attr = (attrs: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1];

function inline(line: string): string {
  return line
    .replace(/<(?:mention-)?page\s+url="([^"]*)"[^>]*>(.*?)<\/(?:mention-)?page>/g, "[$2]($1)")
    .replace(/<mention-(?:database|data-source)\s+url="([^"]*)"[^>]*>(.*?)<\/mention-[a-z-]+>/g, "[$2]($1)")
    .replace(/<mention-date\s+start="([^"]*)"(?:\s+end="([^"]*)")?[^>]*\/>/g, (_, start: string, end?: string) => (end ? `${start} → ${end}` : start))
    .replace(/<mention-user[^>]*>(.*?)<\/mention-user>/g, "@$1")
    .replace(/<summary>(.*?)<\/summary>/g, "**$1**")
    .replace(/<span[^>]*>(.*?)<\/span>/g, "$1")
    .replace(/<[a-z][a-z0-9-]*(?:\s+[a-z-]+="[^"]*")*\s*\/>/gi, "")
    .replace(/\s*\{color="[^"]*"\}\s*$/, "");
}

export function notionMarkdownToGfm(markdown: string): string {
  const out: string[] = [];
  const stack: string[] = [];
  let fence: string | null = null;

  for (const raw of markdown.split("\n")) {
    const depth = stack.length;
    let line = raw;
    for (let i = 0; i < depth && line.startsWith("\t"); i++) line = line.slice(1);
    const quoted = stack.some((t) => QUOTE_TAGS.has(t));
    const prefix = quoted ? "> " : "";

    const fenceMatch = /^\s*(```|~~~)/.exec(line);
    if (fence) {
      out.push(prefix + line);
      if (fenceMatch && fenceMatch[1] === fence) fence = null;
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      out.push(prefix + line);
      continue;
    }

    const tag = BLOCK_TAG.exec(line.trim());
    if (tag) {
      const [, closing, name, attrs, selfClosing] = tag;
      if (closing) {
        const idx = stack.lastIndexOf(name.toLowerCase());
        if (idx !== -1) stack.length = idx;
        out.push(quoted && !stack.some((t) => QUOTE_TAGS.has(t)) ? "" : prefix);
      } else if (selfClosing) {
        out.push(prefix);
      } else {
        stack.push(name.toLowerCase());
        const icon = name.toLowerCase() === "callout" ? attr(attrs, "icon") : undefined;
        if (icon) out.push(`${prefix}> ${icon}`);
      }
      continue;
    }

    out.push(prefix + inline(line));
  }

  return out.join("\n");
}
