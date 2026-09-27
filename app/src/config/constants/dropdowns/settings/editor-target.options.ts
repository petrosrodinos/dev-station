import { EditorTargets, type EditorTarget } from "@shared/contract";

export const EditorTargetOptions: { id: EditorTarget; label: string }[] = [
    { id: EditorTargets.CURSOR, label: "Cursor" },
    { id: EditorTargets.VSCODE, label: "VS Code" },
    { id: EditorTargets.DEFAULT, label: "Default app" },
];

export function getEditorTargetLabel(target: EditorTarget): string {
    return EditorTargetOptions.find((o) => o.id === target)?.label ?? target;
}
