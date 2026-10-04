import type { QueryClient } from "@tanstack/react-query";
import { registerActivityMutations } from "@/features/activities/hooks/use-activities";
import { registerAgentCommandMutations } from "@/features/agent-commands/hooks/use-agent-commands";
import { registerAgentSessionMutations } from "@/features/agent-sessions/hooks/use-agent-sessions";
import { registerGitIdentityMutations } from "@/features/git-identities/hooks/use-git-identities";
import { registerIntegrationMutations } from "@/features/integrations/hooks/use-integrations";
import { registerProjectMutations } from "@/features/projects/hooks/use-projects";
import { registerSkillMutations } from "@/features/skills/hooks/use-skills";
import { registerUserMutations } from "@/features/users/hooks/use-users";
import { registerWorkspaceLayoutMutations } from "@/features/workspace-layouts/hooks/use-workspace-layouts";

/**
 * Single source of truth for every mutation's function and callbacks. Hooks reference a mutation by its
 * key only, so a write restored from the offline outbox after a restart runs exactly like a live one.
 */
export const registerMutationDefaults = (queryClient: QueryClient) => {
    registerActivityMutations(queryClient);
    registerAgentCommandMutations(queryClient);
    registerAgentSessionMutations(queryClient);
    registerGitIdentityMutations(queryClient);
    registerIntegrationMutations(queryClient);
    registerProjectMutations(queryClient);
    registerSkillMutations(queryClient);
    registerUserMutations(queryClient);
    registerWorkspaceLayoutMutations(queryClient);
};
