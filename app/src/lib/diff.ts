export type DiffLineType = "add" | "del" | "ctx" | "hunk" | "meta";

export interface DiffLine {
    type: DiffLineType;
    text: string;
    old_ln: number | null;
    new_ln: number | null;
}

export interface ParsedDiff {
    lines: DiffLine[];
    additions: number;
    deletions: number;
    binary: boolean;
    truncated: boolean;
}

const MAX_LINES = 5000;

/** Parses `git diff` unified output into renderable lines with old/new line numbers. */
export function parseUnifiedDiff(raw: string): ParsedDiff {
    const result: ParsedDiff = { lines: [], additions: 0, deletions: 0, binary: false, truncated: false };
    let oldLn = 0;
    let newLn = 0;
    let inHunk = false;

    for (const text of raw.split("\n")) {
        if (result.lines.length >= MAX_LINES) {
            result.truncated = true;
            break;
        }
        if (text.startsWith("Binary files")) {
            result.binary = true;
            continue;
        }
        const hunk = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunk) {
            oldLn = Number(hunk[1]);
            newLn = Number(hunk[2]);
            inHunk = true;
            result.lines.push({ type: "hunk", text, old_ln: null, new_ln: null });
            continue;
        }
        if (!inHunk) continue; // skip headers (diff --git, index, ---/+++)
        if (text.startsWith("+")) {
            result.additions++;
            result.lines.push({ type: "add", text: text.slice(1), old_ln: null, new_ln: newLn++ });
        } else if (text.startsWith("-")) {
            result.deletions++;
            result.lines.push({ type: "del", text: text.slice(1), old_ln: oldLn++, new_ln: null });
        } else if (text.startsWith("\\")) {
            result.lines.push({ type: "meta", text, old_ln: null, new_ln: null });
        } else if (text.length || oldLn || newLn) {
            result.lines.push({ type: "ctx", text: text.slice(1), old_ln: oldLn++, new_ln: newLn++ });
        }
    }
    // Trailing empty context line produced by the final newline.
    const last = result.lines[result.lines.length - 1];
    if (last?.type === "ctx" && last.text === "" ) result.lines.pop();
    return result;
}
