import type { SecretVariable } from "../interfaces/project-secrets.interfaces";

const LINE_RE = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

const unquote = (raw: string): string => {
    const value = raw.trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
    // Unquoted: a trailing ` # comment` is not part of the value.
    return value.replace(/\s+#.*$/, "");
};

/** Parses pasted `.env` text. Blank lines and `#` comments are skipped; the last occurrence of a key wins. */
export const parseEnvText = (text: string): { variables: SecretVariable[]; skipped: number } => {
    const byKey = new Map<string, string>();
    let skipped = 0;
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = LINE_RE.exec(trimmed);
        if (!match) {
            skipped += 1;
            continue;
        }
        byKey.set(match[1], unquote(match[2]));
    }
    return { variables: [...byKey].map(([key, value]) => ({ key, value })), skipped };
};

const needsQuotes = (value: string) => /[\s#"'\\]/.test(value) || value === "";

/** Serialises variables back to `.env` text, quoting only values that would not survive a round trip. */
export const formatEnvText = (variables: SecretVariable[]): string =>
    variables
        .map(({ key, value }) => {
            const safe = needsQuotes(value) ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"` : value;
            return `${key}=${safe}`;
        })
        .join("\n");

/** What applying a set to a local file would do, by key name only (values are never shown in the summary). */
export const diffVariables = (local: SecretVariable[], shared: SecretVariable[]) => {
    const localByKey = new Map(local.map((v) => [v.key, v.value]));
    const added: string[] = [];
    const changed: string[] = [];
    for (const { key, value } of shared) {
        if (!localByKey.has(key)) added.push(key);
        else if (localByKey.get(key) !== value) changed.push(key);
    }
    return { added, changed, unchanged: shared.length - added.length - changed.length };
};

/** Shared values win over local ones for the same key; local-only keys are kept as they are. */
export const mergeVariables = (local: SecretVariable[], shared: SecretVariable[]): SecretVariable[] => {
    const sharedByKey = new Map(shared.map((v) => [v.key, v.value]));
    const merged = local.map((v) => (sharedByKey.has(v.key) ? { key: v.key, value: sharedByKey.get(v.key)! } : v));
    const localKeys = new Set(local.map((v) => v.key));
    return [...merged, ...shared.filter((v) => !localKeys.has(v.key))];
};
