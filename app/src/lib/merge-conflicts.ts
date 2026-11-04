// Parses Git conflict markers (merge and diff3 styles) so each conflict can be resolved block by block.

export type ConflictChoice = "current" | "incoming" | "both";

export interface TextSegment {
    type: "text";
    text: string;
}

export interface ConflictBlock {
    type: "conflict";
    /** Position among the conflict blocks of the file (not among all segments). */
    index: number;
    current: string;
    incoming: string;
    currentLabel: string;
    incomingLabel: string;
    /** The original text including markers, kept so unresolved blocks round-trip untouched. */
    raw: string;
}

export type ConflictSegment = TextSegment | ConflictBlock;

const START = /^<{7}(?: (.*))?$/;
const BASE = /^\|{7}(?: .*)?$/;
const MIDDLE = /^={7}$/;
const END = /^>{7}(?: (.*))?$/;

export function parseConflicts(content: string): ConflictSegment[] {
    const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const strip = (l: string) => l.replace(/\r?\n$/, "");
    const segments: ConflictSegment[] = [];
    let text = "";
    let index = 0;

    for (let i = 0; i < lines.length; i++) {
        const start = START.exec(strip(lines[i]));
        if (!start) {
            text += lines[i];
            continue;
        }
        // Find the matching end first; a stray "<<<<<<<" without one is ordinary text.
        let mid = -1;
        let end = -1;
        let inBase = false;
        for (let j = i + 1; j < lines.length; j++) {
            const line = strip(lines[j]);
            if (mid === -1 && BASE.test(line)) inBase = true;
            else if (mid === -1 && MIDDLE.test(line)) mid = j;
            else if (mid !== -1 && END.test(line)) {
                end = j;
                break;
            }
        }
        if (end === -1) {
            text += lines[i];
            continue;
        }
        const baseAt = inBase ? lines.findIndex((l, k) => k > i && k < mid && BASE.test(strip(l))) : mid;
        if (text) segments.push({ type: "text", text });
        text = "";
        segments.push({
            type: "conflict",
            index: index++,
            current: lines.slice(i + 1, baseAt).join(""),
            incoming: lines.slice(mid + 1, end).join(""),
            currentLabel: start[1] ?? "Current",
            incomingLabel: END.exec(strip(lines[end]))?.[1] ?? "Incoming",
            raw: lines.slice(i, end + 1).join(""),
        });
        i = end;
    }
    if (text) segments.push({ type: "text", text });
    return segments;
}

export const countConflicts = (segments: ConflictSegment[]) => segments.filter((s) => s.type === "conflict").length;

/** Returns the file content with one conflict block replaced by the chosen side(s). */
export function resolveBlock(segments: ConflictSegment[], blockIndex: number, choice: ConflictChoice): string {
    return segments
        .map((s) => {
            if (s.type === "text") return s.text;
            if (s.index !== blockIndex) return s.raw;
            if (choice === "current") return s.current;
            if (choice === "incoming") return s.incoming;
            const current = s.current && !s.current.endsWith("\n") && s.incoming ? `${s.current}\n` : s.current;
            return current + s.incoming;
        })
        .join("");
}
