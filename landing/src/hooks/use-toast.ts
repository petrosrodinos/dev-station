import { toast as toastManager } from "@/components/ui/toast";

interface ToastOptions {
    title: string;
    description?: string;
    duration?: number;
    variant?: "success" | "error" | "warning" | "info";
}

/** Thin wrapper around @dev-station/ui's base-ui toast manager, matching the call shape used across the codebase. */
export const toast = ({ title, description, duration, variant }: ToastOptions) =>
    toastManager.add({ title, description, timeout: duration, type: variant });
