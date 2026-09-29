import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { useSendCustomSkill, useSendSkill } from "@/features/skills/hooks/use-skills";
import type { UnifiedSkill } from "@/features/skills/interfaces/skills.interfaces";
import { getAgentTypeLabel } from "@/config/constants/dropdowns/agents/agent-type-form.options";
import { SkillSendModeOptions } from "@/config/constants/dropdowns/skills/skill.options";
import { agentStatusDot } from "@/lib/status";
import { toast } from "@/hooks/use-toast";
import { useRuntimeStore } from "@/stores/runtime";
import { useWorkspaceStore } from "@/stores/workspace";
import { SkillSendModes, type SkillSendMode } from "@shared/contract";

interface SkillSendDialogProps {
  skill: UnifiedSkill | null;
  projectId: string;
  onOpenChange: (open: boolean) => void;
}

/** Types a skill into one of this project's running agent sessions. Custom skills have no file to
 * reference, so they can only be sent as pasted content. */
export function SkillSendDialog({ skill, projectId, onOpenChange }: SkillSendDialogProps) {
  const isCustom = skill?.source === "custom";
  const agents = useRuntimeStore((s) => s.agents);
  const openSessionTab = useWorkspaceStore((s) => s.openSessionTab);
  const sendSkill = useSendSkill();
  const sendCustomSkill = useSendCustomSkill();
  const isPending = sendSkill.isPending || sendCustomSkill.isPending;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<SkillSendMode>(SkillSendModes.REFERENCE);
  const [submit, setSubmit] = useState(false);

  const sessions = useMemo(() => Object.values(agents).filter((a) => a.project_id === projectId && a.alive), [agents, projectId]);
  const selected = sessionId && sessions.some((s) => s.id === sessionId) ? sessionId : (sessions[0]?.id ?? null);
  const effectiveMode = isCustom ? SkillSendModes.CONTENT : mode;

  const send = () => {
    if (!skill || !selected) return;
    const onSuccess = () => {
      toast({ title: `Sent "${skill.name}"`, description: submit ? "Submitted to the agent" : "Pasted into the terminal. Review it, then press Enter.", duration: 2500 });
      openSessionTab(selected);
      onOpenChange(false);
    };
    if (isCustom) {
      sendCustomSkill.mutate({ session_id: selected, name: skill.name, kind: skill.kind, body: skill.body ?? "", submit }, { onSuccess });
    } else {
      sendSkill.mutate({ session_id: selected, skill_id: skill.id, mode: effectiveMode, submit }, { onSuccess });
    }
  };

  return (
    <Dialog open={!!skill} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to agent session</DialogTitle>
          <DialogDescription>{skill ? `Give "${skill.name}" to a running agent in this project.` : null}</DialogDescription>
        </DialogHeader>

        {sessions.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-[0.8125rem] text-muted-foreground">No agent session is running in this project. Start one from AI Sessions first.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Session</Label>
              <Select value={selected ?? undefined} onValueChange={setSessionId}>
                <SelectTrigger aria-label="Session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <StatusDot status={agentStatusDot(s.status)} />
                        <span className="truncate">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{getAgentTypeLabel(s.agent_type)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCustom ? (
              <p className="rounded-md border p-2.5 text-xs text-muted-foreground">This skill has no file on disk, so it's always pasted in full.</p>
            ) : (
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as SkillSendMode)} className="space-y-2">
                {SkillSendModeOptions.map((o) => (
                  <Label key={o.id} htmlFor={`send-mode-${o.id}`} className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 font-normal has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem id={`send-mode-${o.id}`} value={o.id} className="mt-0.5" />
                    <span className="space-y-0.5">
                      <span className="block text-[0.8125rem] font-medium">{o.label}</span>
                      <span className="block text-xs text-muted-foreground">{o.description}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}

            <Label htmlFor="send-submit" className="flex cursor-pointer items-center gap-2 font-normal">
              <Checkbox id="send-submit" checked={submit} onCheckedChange={(v) => setSubmit(v === true)} />
              Press Enter after pasting (otherwise you review it first)
            </Label>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!selected} loading={isPending} className="gap-1.5">
            <Send className="size-3.5" /> Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
