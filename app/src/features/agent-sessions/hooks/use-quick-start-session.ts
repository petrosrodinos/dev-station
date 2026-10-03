import { useCallback } from "react";
import { useStartAgentSession } from "./use-agent-sessions";
import { useAgentCommands } from "@/features/agent-commands/hooks/use-agent-commands";
import { findDefaultCommand } from "@/features/agent-commands/utils/agent-commands.utils";
import { useGetProjects } from "@/features/projects/hooks/use-projects";
import { useWorkspaceConfig } from "@/features/local-workspace/hooks/use-local-workspace";
import { useGetPreferences } from "@/features/users/hooks/use-users";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { useDialogsStore } from "@/stores/dialogs";
import { isDesktop } from "@/lib/desktop";
import { AgentTypes, type AgentType } from "@shared/contract";

/**
 * Starts an interactive agent session in a project straight away — no dialog, default name, no
 * initial prompt. Outside the desktop app it falls back to the dialog, which explains why agents
 * can't run there.
 */
export const useQuickStartSession = () => {
  const start = useStartAgentSession();
  const { data: projects } = useGetProjects();
  const { data: preferences } = useGetPreferences();
  const { data: workspaceConfig } = useWorkspaceConfig();
  const { data: allCommands } = useAgentCommands();

  return useCallback(
    (projectId: string | null) => {
      if (!projectId || !isDesktop()) {
        useDialogsStore.getState().openNewSession({ project_id: projectId });
        return;
      }
      const project = projects?.find((p) => p.id === projectId);
      const agentType = (project?.preferred_agent ?? preferences?.preferred_agent ?? AgentTypes.CLAUDE_CODE) as AgentType;
      start.mutate({
        project_id: projectId,
        agent_type: agentType,
        name: `${getAgentTypeLabel(agentType)} session`,
        prompt: null,
        command_id: findDefaultCommand(allCommands ?? [], agentType)?.id,
        device_id: workspaceConfig?.device_id ?? null,
        idle_threshold_seconds: preferences?.idle_threshold_seconds,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, preferences, workspaceConfig, allCommands, start.mutate],
  );
};
