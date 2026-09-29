import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentCommands, useCreateAgentCommand, useDeleteAgentCommand, useUpdateAgentCommand } from "@/features/agent-commands/hooks/use-agent-commands";
import { AgentTypeFormOptions, getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { AgentTypes, type AgentType } from "@shared/contract";
import { SettingsSectionHeader } from "./settings-row";

const COMMAND_PLACEHOLDERS: Record<AgentType, string> = {
  CLAUDE_CODE: "claude --dangerously-skip-permissions",
  CURSOR_CLI: "cursor-agent --force",
};

/** Custom launch commands per agent CLI (stored on the account), with one optional default per provider. */
export function AgentCommandsSettings() {
  const { data: commands = [] } = useAgentCommands();
  const create = useCreateAgentCommand();
  const update = useUpdateAgentCommand();
  const remove = useDeleteAgentCommand();
  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState<AgentType>(AgentTypes.CLAUDE_CODE);
  const [command, setCommand] = useState("");

  const busy = create.isPending || update.isPending || remove.isPending;
  const canAdd = name.trim().length > 0 && command.trim().length > 0;

  const add = () => {
    if (!canAdd) return;
    const isFirstForAgent = !commands.some((c) => c.agent_type === agentType);
    create.mutate(
      { name: name.trim(), agent_type: agentType, command: command.trim(), is_default: isFirstForAgent },
      {
        onSuccess: () => {
          setName("");
          setCommand("");
        },
      },
    );
  };

  return (
    <div className="@container mt-6">
      <SettingsSectionHeader
        title="Custom commands"
        description="Launch an agent with your own flags, e.g. claude --dangerously-skip-permissions. The default command for each agent is used whenever a session starts."
      />

      {commands.length > 0 && (
        <ul className="mb-3 divide-y divide-hairline-soft rounded-md border">
          {commands.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[0.8125rem]">
                  <span className="truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{getAgentTypeLabel(c.agent_type)}</span>
                  {c.is_default && <Badge variant="secondary">Default</Badge>}
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground" title={c.command}>
                  {c.command}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => update.mutate({ id: c.id, is_default: !c.is_default })} disabled={busy}>
                <Star className={c.is_default ? "size-3.5 fill-current" : "size-3.5"} /> {c.is_default ? "Unset default" : "Set default"}
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => remove.mutate(c.id)} disabled={busy}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 @xl:flex-row">
        <Input className="@xl:w-44" placeholder="Name (e.g. YOLO)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Select value={agentType} onValueChange={(v) => setAgentType(v as AgentType)}>
          <SelectTrigger className="@xl:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AgentTypeFormOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="font-mono text-xs @xl:flex-1"
          placeholder={COMMAND_PLACEHOLDERS[agentType]}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          maxLength={2000}
        />
        <Button type="button" variant="outline" className="gap-1.5" onClick={add} disabled={!canAdd || busy}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}
