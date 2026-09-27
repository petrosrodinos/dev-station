import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import type { Project, ProjectService } from "@/features/projects/interfaces/projects.interfaces";
import { processKey, useLoadProcessLogs, useProcessLogs, useProjectProcesses } from "@/features/processes/hooks/use-processes";
import { processStatusDot } from "@/lib/status";
import { formatClock } from "@/lib/date";
import { cn } from "@/lib/utils";

const Streams = { ALL: "all", ERRORS: "errors" } as const;
type Stream = (typeof Streams)[keyof typeof Streams];

/** Process output + error logs with follow mode. */
export function ServiceLogsSheet({ project, service, onClose }: { project: Project; service: ProjectService | null; onClose: () => void }) {
  const key = service ? processKey(project.id, service.id) : null;
  const logs = useProcessLogs(key);
  const proc = useProjectProcesses(project.id)[service?.id ?? ""];
  const load = useLoadProcessLogs();
  const [stream, setStream] = useState<Stream>(Streams.ALL);
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (key) load.mutate(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (follow && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, follow, stream]);

  const lines = (logs ?? []).filter((l) => stream === Streams.ALL || l.stream === "stderr");

  return (
    <Sheet open={!!service} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-[720px] max-w-[90vw] flex-col gap-0 p-0 sm:max-w-[720px]">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <StatusDot status={processStatusDot(proc?.status)} /> {service?.name} logs
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {proc ? `${proc.command} · ${proc.cwd}${proc.pid ? ` · pid ${proc.pid}` : ""}` : "Not started on this device yet"}
          </SheetDescription>
          <div className="flex items-center gap-2 pt-2">
            <Tabs value={stream} onValueChange={(v) => setStream(v as Stream)}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value={Streams.ALL} className="h-6 px-2 text-xs">
                  Output
                </TabsTrigger>
                <TabsTrigger value={Streams.ERRORS} className="h-6 px-2 text-xs">
                  Errors
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant={follow ? "secondary" : "ghost"} size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={() => setFollow((f) => !f)}>
              <ArrowDownToLine className="size-3.5" /> Follow
            </Button>
          </div>
        </SheetHeader>
        <div
          ref={scrollRef}
          onWheel={() => setFollow(false)}
          className="min-h-0 flex-1 overflow-auto bg-terminal p-3 font-mono text-[12px] leading-relaxed"
        >
          {lines.length === 0 ? (
            <div className="text-ash">No output yet.</div>
          ) : (
            lines.map((l, i) => (
              <div key={i} className={cn("whitespace-pre-wrap break-all", l.stream === "stderr" && "text-danger", l.stream === "system" && "text-ash", l.stream === "stdout" && "text-[#d7f7dd]")}>
                <span className="mr-2 select-none text-stone">{formatClock(l.at)}</span>
                {l.text}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
