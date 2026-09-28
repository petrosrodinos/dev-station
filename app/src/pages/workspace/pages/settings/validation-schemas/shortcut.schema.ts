import { z } from "zod";
import { CustomShortcutTypes } from "@/features/users/interfaces/users.interfaces";
import { SHORTCUT_COMBO_PATTERN } from "@/lib/shortcuts.utils";

export const customShortcutSchema = z
    .object({
        name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
        type: z.enum([CustomShortcutTypes.ACTION, CustomShortcutTypes.AI_PROMPT]),
        action_id: z.string().optional(),
        prompt: z.string().trim().max(4000, "Prompt is too long").optional(),
        combo: z.string().regex(SHORTCUT_COMBO_PATTERN, "Record a shortcut"),
    })
    .superRefine((data, ctx) => {
        if (data.type === CustomShortcutTypes.ACTION && !data.action_id) ctx.addIssue({ code: "custom", path: ["action_id"], message: "Choose an action" });
        if (data.type === CustomShortcutTypes.AI_PROMPT && !data.prompt) ctx.addIssue({ code: "custom", path: ["prompt"], message: "Enter a prompt" });
    });
export type CustomShortcutFormData = z.infer<typeof customShortcutSchema>;
