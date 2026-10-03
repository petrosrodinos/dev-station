import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentCommands, useCreateAgentCommand, useDeleteAgentCommand, useUpdateAgentCommand } from "@/features/agent-commands/hooks/use-agent-commands";
import type { AgentCommand } from "@/features/agent-commands/interfaces/agent-commands.interfaces";
import { AgentTypeFormOptions, getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { AgentTypes, type AgentType } from "@shared/contract";
import { SettingsSectionHeader } from "./settings-row";

const COMMAND_PLACEHOLDERS: Record<AgentType, string> = {
  CLAUDE_CODE: "claude --dangerously-skip-permissions",
  CURSOR_CLI: "cursor-agent --force",
};

interface CommandDraft {
  name: string;
  agent_type: AgentType;
  command: string;
}

const emptyDraft = (): CommandDraft => ({ name: "", agent_type: AgentTypes.CLAUDE_CODE, command: "" });

function AgentTypeSelect({ value, onChange, className }: { value: AgentType; onChange: (value: AgentType) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AgentType)}>
      <SelectTrigger className={className}>
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
  );
}

/** Custom launch commands per agent CLI (stored on the account), with one optional default per provider. */
export function AgentCommandsSettings() {
  const { data: commands = [] } = useAgentCommands();
  const create = useCreateAgentCommand();
  const update = useUpdateAgentCommand();
  const remove = useDeleteAgentCommand();
  const [draft, setDraft] = useState<CommandDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CommandDraft>(emptyDraft);

  const busy = create.isPending || update.isPending || remove.isPending;
  const canAdd = draft.name.trim().length > 0 && draft.command.trim().length > 0;
  const canSave = editDraft.name.trim().length > 0 && editDraft.command.trim().length > 0;

  const startEdit = (c: AgentCommand) => {
    setEditDraft({ name: c.name, agent_type: c.agent_type, command: c.command });
    setEditingId(c.id);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = () => {
    if (!editingId || !canSave) return;
    update.mutate(
      { id: editingId, name: editDraft.name.trim(), agent_type: editDraft.agent_type, command: editDraft.command.trim() },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const add = () => {
    if (!canAdd) return;
    const isFirstForAgent = !commands.some((c) => c.agent_type === draft.agent_type);
    create.mutate(
      { name: draft.name.trim(), agent_type: draft.agent_type, command: draft.command.trim(), is_default: isFirstForAgent },
      { onSuccess: () => setDraft(emptyDraft()) },
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
          {commands.map((c) =>
            editingId === c.id ? (
              <li key={c.id} className="flex flex-col gap-2 px-3 py-2 @xl:flex-row @xl:items-center">
                <Input className="@xl:w-44" aria-label="Command name" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} maxLength={80} autoFocus />
                <AgentTypeSelect className="@xl:w-40" value={editDraft.agent_type} onChange={(agent_type) => setEditDraft({ ...editDraft, agent_type })} />
                <Input
                  className="font-mono text-xs @xl:flex-1"
                  aria-label="Command line"
                  value={editDraft.command}
                  onChange={(e) => setEditDraft({ ...editDraft, command: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveEdit();
                    }
                  }}
                  maxLength={2000}
                />
                <div className="flex shrink-0 justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={update.isPending}>
                    Cancel
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={saveEdit} disabled={!canSave || update.isPending}>
                    Save
                  </Button>
                </div>
              </li>
            ) : (
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
                <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => startEdit(c)} disabled={busy}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => remove.mutate(c.id)} disabled={busy}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="flex flex-col gap-2 @xl:flex-row">
        <Input className="@xl:w-44" placeholder="Name (e.g. YOLO)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
        <AgentTypeSelect className="@xl:w-40" value={draft.agent_type} onChange={(agent_type) => setDraft({ ...draft, agent_type })} />
        <Input
          className="font-mono text-xs @xl:flex-1"
          placeholder={COMMAND_PLACEHOLDERS[draft.agent_type]}
          value={draft.command}
          onChange={(e) => setDraft({ ...draft, command: e.target.value })}
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
