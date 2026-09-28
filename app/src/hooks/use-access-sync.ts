import { useEffect } from "react";
import { getBridge, isDesktop } from "@/lib/desktop";
import { usePermissions } from "@/features/organizations/hooks/use-organizations";

/** Pushes the caller's permissions to the Electron main process (defense-in-depth; the API is authoritative). */
export const useAccessSync = () => {
    const { ready, permissions } = usePermissions();

    useEffect(() => {
        if (!isDesktop() || !ready) return;
        void getBridge().access.sync(Array.from(permissions)).catch(() => undefined);
    }, [ready, permissions]);

    useEffect(() => {
        if (!isDesktop()) return;
        return () => {
            void getBridge().access.sync([]).catch(() => undefined);
        };
    }, []);
};
