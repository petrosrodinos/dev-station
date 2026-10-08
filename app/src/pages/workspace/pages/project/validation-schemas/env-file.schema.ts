import { z } from "zod";

export const envFileFormSchema = z
    .object({
        variables: z.array(z.object({ key: z.string().trim().max(200), value: z.string().max(100_000) })).max(2000),
    })
    .superRefine((form, ctx) => {
        const seen = new Set<string>();
        form.variables.forEach((row, i) => {
            if (!row.key && !row.value) return; // blank rows are dropped on save
            if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(row.key)) ctx.addIssue({ code: "custom", path: ["variables", i, "key"], message: "Letters, digits and _ only" });
            else if (seen.has(row.key)) ctx.addIssue({ code: "custom", path: ["variables", i, "key"], message: "Duplicate variable" });
            seen.add(row.key);
        });
    });

export type EnvFileFormData = z.infer<typeof envFileFormSchema>;
