import { z } from "zod";

// Mirrors the API limits (project-secrets DTOs): 200 variables, 10k per value, names are plain identifiers.
export const secretSetFormSchema = z
    .object({
        name: z.string().trim().min(1, "Give the set a name").max(60, "At most 60 characters"),
        description: z.string().trim().max(300, "At most 300 characters").optional(),
        variables: z.array(z.object({ key: z.string().trim().max(200), value: z.string().max(10_000, "At most 10,000 characters") })).max(200, "At most 200 variables"),
    })
    .superRefine((form, ctx) => {
        const seen = new Set<string>();
        form.variables.forEach((row, i) => {
            if (!row.key && !row.value) return; // blank rows are dropped on save
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(row.key)) ctx.addIssue({ code: "custom", path: ["variables", i, "key"], message: "Letters, digits and _ only" });
            else if (seen.has(row.key)) ctx.addIssue({ code: "custom", path: ["variables", i, "key"], message: "Duplicate variable" });
            seen.add(row.key);
        });
    });

export type SecretSetFormData = z.infer<typeof secretSetFormSchema>;
