import { z } from "zod";

export const SignInSchema = z.object({
    email: z.string().trim().min(1, { message: "Please enter your email" }).email({ message: "Enter a valid email" }),
    password: z.string().min(1, { message: "Please enter your password" }),
});

export const SignUpSchema = z
    .object({
        full_name: z.string().trim().min(1, { message: "Please enter your name" }).max(120),
        email: z.string().trim().min(1, { message: "Please enter your email" }).email({ message: "Enter a valid email" }),
        password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
        confirm_password: z.string(),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: "Passwords don't match.",
        path: ["confirm_password"],
    });

export type SignInFormValues = z.infer<typeof SignInSchema>;
export type SignUpFormValues = z.infer<typeof SignUpSchema>;
