import { ServiceKinds, type ServiceKind } from "@/features/projects/interfaces/projects.interfaces";

export const ServiceKindFormOptions: { id: ServiceKind; label: string }[] = [
    { id: ServiceKinds.FRONTEND, label: "Frontend" },
    { id: ServiceKinds.API, label: "API / Backend" },
    { id: ServiceKinds.WORKER, label: "Worker" },
    { id: ServiceKinds.DATABASE, label: "Database / Infra" },
    { id: ServiceKinds.STORYBOOK, label: "Storybook" },
    { id: ServiceKinds.OTHER, label: "Other" },
];
