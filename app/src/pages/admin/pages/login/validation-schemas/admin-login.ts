import { z } from "zod";

export const AdminLoginSchema = z.object({
    email: z.string().trim().min(1, { message: "Please enter your email" }).email({ message: "Enter a valid email" }),
    password: z.string().min(1, { message: "Please enter your password" }),
});

export type AdminLoginFormValues = z.infer<typeof AdminLoginSchema>;
