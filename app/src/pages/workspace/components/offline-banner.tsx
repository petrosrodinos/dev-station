import { useEffect, useRef, type FC } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus, usePendingSyncCount } from "@/hooks/use-online-status";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const countLabel = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Announces each transition once: the connection dropping, returning with work to sync, and the queue draining. */
const useSyncNotices = (online: boolean, pending: number) => {
    const wasOnline = useRef(online);
    const hadPending = useRef(pending > 0);

    useEffect(() => {
        if (wasOnline.current && !online) {
            toast({
                title: "You're offline",
                description: "Changes are saved on this device and will sync when you reconnect.",
                variant: "warning",
                duration: 5000,
            });
        }
        if (!wasOnline.current && online && pending > 0) {
            toast({
                title: "Back online",
                description: `Syncing ${countLabel(pending, "change", "changes")}…`,
                variant: "info",
                duration: 3000,
            });
        }
        if (online && hadPending.current && pending === 0) {
            toast({ title: "All changes synced", variant: "success", duration: 3000 });
        }
        wasOnline.current = online;
        hadPending.current = pending > 0;
    }, [online, pending]);
};

/** Slim status strip above the workspace. Hidden whenever the app is online with nothing waiting to sync. */
export const OfflineBanner: FC = () => {
    const online = useOnlineStatus();
    const pending = usePendingSyncCount();
    useSyncNotices(online, pending);

    if (online && pending === 0) return null;

    const Icon = online ? RefreshCw : WifiOff;
    const message = online
        ? `Back online. Syncing ${countLabel(pending, "change", "changes")}…`
        : pending > 0
          ? `Offline. ${countLabel(pending, "change is", "changes are")} saved on this device and waiting to sync.`
          : "Offline. Showing saved data. Changes you make will sync when you reconnect.";

    return (
        <div role="status" aria-live="polite" className="flex items-center gap-2 bg-warning-soft px-4 py-1.5 text-sm text-warning">
            <Icon className={cn("size-4 shrink-0", online && "animate-spin")} aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
};
