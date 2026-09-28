import type { DetectedService } from "@shared/contract";
import type { ProjectService, ServiceInput } from "../interfaces/projects.interfaces";

/** Maps auto-detected services (Electron detection) to the API's service definition payload. */
export const detectedToServiceInputs = (services: DetectedService[]): ServiceInput[] =>
    services.map((s) => ({
        name: s.name,
        kind: s.kind,
        cwd: s.cwd,
        package_manager: s.package_manager,
        script: s.script,
        command: s.command,
        port: s.port,
        url: s.url,
        env: s.env ?? null,
        auto_detected: true,
    }));

export const serviceToInput = (s: ProjectService): ServiceInput => ({
    name: s.name,
    kind: s.kind,
    cwd: s.cwd,
    package_manager: s.package_manager,
    script: s.script,
    command: s.command,
    port: s.port,
    url: s.url,
    env: s.env,
    auto_detected: s.auto_detected,
});

/** The command string shown to users for a service definition (never hard-codes `npm run dev`). */
export const describeServiceCommand = (s: Pick<ProjectService, "package_manager" | "script" | "command">): string => {
    if (s.script) {
        const pm = s.package_manager ?? "npm";
        return pm === "yarn" ? `yarn ${s.script}` : `${pm} run ${s.script}`;
    }
    return s.command ?? "";
};
