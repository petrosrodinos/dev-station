import { useEffect, useRef, useState, type FC } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useOnlineStatus, usePendingSyncCount } from "@/hooks/use-online-status";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const countLabel = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * "offline": the connection dropped. "syncing": it came back with queued writes that are replaying.
 * "idle": nothing is waiting because of the connection. Writes can pause briefly while online too (for
 * example one waiting behind another write in the same scope), and that must not look like an outage.
 */
type SyncPhase = "idle" | "offline" | "syncing";

/** Announces each real outage once: the connection dropping, returning with work to sync, and the queue draining. */
const useSyncPhase = (online: boolean, pending: number): SyncPhase => {
    const [phase, setPhase] = useState<SyncPhase>(online ? "idle" : "offline");
    const wasOnline = useRef(online);

    useEffect(() => {
        if (wasOnline.current && !online) {
            toast({
                title: "You're offline",
                description: "Changes are saved on this device and will sync when you reconnect.",
                variant: "warning",
                duration: 5000,
            });
            setPhase("offline");
        }
        if (!wasOnline.current && online) {
            if (pending > 0) {
                toast({
                    title: "Back online",
                    description: `Syncing ${countLabel(pending, "change", "changes")}…`,
                    variant: "info",
                    duration: 3000,
                });
                setPhase("syncing");
            } else {
                setPhase("idle");
            }
        }
        if (online && phase === "syncing" && pending === 0) {
            toast({ title: "All changes synced", variant: "success", duration: 3000 });
            setPhase("idle");
        }
        wasOnline.current = online;
    }, [online, pending, phase]);

    return phase;
};

/** Slim status strip above the workspace. Hidden whenever nothing is waiting on the connection. */
export const OfflineBanner: FC = () => {
    const online = useOnlineStatus();
    const pending = usePendingSyncCount();
    const phase = useSyncPhase(online, pending);

    if (online && (pending === 0 || phase !== "syncing")) return null;

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
