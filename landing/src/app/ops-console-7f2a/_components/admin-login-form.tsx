"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useAdminSignin } from "@/features/auth/hooks/use-auth";
import { AdminLoginSchema, type AdminLoginFormValues } from "../_validation-schemas/admin-login";

export function AdminLoginForm() {
    const { mutate, isPending } = useAdminSignin();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AdminLoginFormValues>({ resolver: zodResolver(AdminLoginSchema), defaultValues: { email: "", password: "" } });

    return (
        <form onSubmit={handleSubmit((data) => mutate(data))} className="grid gap-3">
            <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@agency.com" autoFocus {...register("email")} />
                {errors.email && <p className="text-[0.8125rem] text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-[0.8125rem] text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="mt-2" loading={isPending}>
                Sign in
            </Button>
        </form>
    );
}
