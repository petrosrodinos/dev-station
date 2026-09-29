"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    return (
        <div className={cn("relative", className)}>
            <Input type={showPassword ? "text" : "password"} className="pr-8" disabled={disabled} ref={ref} {...props} />
            <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
            >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
        </div>
    );
});
PasswordInput.displayName = "PasswordInput";
