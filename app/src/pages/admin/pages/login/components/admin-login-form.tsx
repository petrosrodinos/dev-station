import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { useAdminSignin } from "@/features/auth/hooks/use-auth";
import { AdminLoginSchema, type AdminLoginFormValues } from "../validation-schemas/admin-login";

export function AdminLoginForm() {
    const { mutate, isPending } = useAdminSignin();
    const form = useForm<AdminLoginFormValues>({ resolver: zodResolver(AdminLoginSchema), defaultValues: { email: "", password: "" } });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutate(data))} className="grid gap-3">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" autoComplete="email" placeholder="you@agency.com" autoFocus {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="mt-2" loading={isPending}>
                    Sign in
                </Button>
            </form>
        </Form>
    );
}
