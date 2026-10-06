import { ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAcceptProjectEnvConsent } from "@/features/projects/hooks/use-projects";

interface EnvAccessConsentDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted: () => void;
}

/** Asks, once per user and project, before Dev Station reads the project's `.env` files on this device. */
export function EnvAccessConsentDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  onAccepted,
}: EnvAccessConsentDialogProps) {
  const accept = useAcceptProjectEnvConsent(projectId);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> Read .env files in {projectName}?
          </AlertDialogTitle>
          <AlertDialogDescription render={<div />} className="space-y-2">
            <p>
              To suggest variable names, Dev Station will read the{" "}
              <code className="font-mono">.env*</code> files in this service's
              folder on this computer.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Only the variable names are shown. Values are never displayed.</li>
              <li>
                Nothing from these files is stored or sent to our servers. Only
                your choice (you, this project, and when you agreed) is saved.
              </li>
              <li>The files are read again each time you open the picker.</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={accept.isPending}
          >
            Not now
          </Button>
          <Button
            type="button"
            disabled={accept.isPending}
            onClick={() =>
              accept.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  onAccepted();
                },
              })
            }
          >
            Allow for this project
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
