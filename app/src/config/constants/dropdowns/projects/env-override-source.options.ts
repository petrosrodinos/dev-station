import { EnvOverrideSources, type EnvOverrideSource } from "@shared/contract";

/** Why a running service got a different value than the .env file holds (shown under the variable). */
export const EnvOverrideSourceOptions: { id: EnvOverrideSource; label: string; description: string }[] = [
    {
        id: EnvOverrideSources.PORT_SHIFT,
        label: "Port moved",
        description: "The port in this file was taken, so Dev Station started the service on another one and passed the updated URL.",
    },
    {
        id: EnvOverrideSources.SERVICE_ENV,
        label: "Set in service settings",
        description: "This variable is set in the service's Dev Station environment settings, which take priority over the file.",
    },
];

export function getEnvOverrideSourceDescription(source: EnvOverrideSource | string): string {
    return EnvOverrideSourceOptions.find((option) => option.id === source)?.description ?? "";
}
