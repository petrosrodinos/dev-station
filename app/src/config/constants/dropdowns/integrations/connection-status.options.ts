import { ConnectionStatuses, type ConnectionStatus } from "@/features/integrations/interfaces/integrations.interfaces";

export const ConnectionStatusOptions: { id: ConnectionStatus; label: string }[] = [
    { id: ConnectionStatuses.ACTIVE, label: "Connected" },
    { id: ConnectionStatuses.INITIATED, label: "Awaiting authorization" },
    { id: ConnectionStatuses.FAILED, label: "Failed" },
    { id: ConnectionStatuses.EXPIRED, label: "Expired" },
    { id: ConnectionStatuses.DISCONNECTED, label: "Disconnected" },
];
