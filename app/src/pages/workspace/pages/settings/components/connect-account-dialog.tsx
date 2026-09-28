import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { IntegrationProvider } from "@/features/integrations/interfaces/integrations.interfaces";
import { useInitiateConnection } from "@/features/integrations/hooks/use-integrations";
import { openUrl } from "@/features/local-workspace/services/local-workspace.services";

interface ConnectAccountDialogProps {
  provider: IntegrationProvider;
  providerName: string;
  existingCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Starts a Composio OAuth connection; authorization happens in the system browser. */
export function ConnectAccountDialog({ provider, providerName, existingCount, open, onOpenChange }: ConnectAccountDialogProps) {
  const initiate = useInitiateConnection();
  const [label, setLabel] = useState("");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLabel(existingCount ? "" : `Company ${providerName}`);
      setRedirectUrl(null);
    }
  }, [open, existingCount, providerName]);

  const start = () =>
    initiate.mutate(
      { provider, label: label.trim() || undefined },
      {
        onSuccess: ({ redirect_url }) => {
          setRedirectUrl(redirect_url);
          if (redirect_url) void openUrl(redirect_url);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !initiate.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {providerName}</DialogTitle>
          <DialogDescription>You can connect several accounts (e.g. personal, company, client) and pick one per project.</DialogDescription>
        </DialogHeader>
        {redirectUrl ? (
          <div className="space-y-3 text-[0.8125rem]">
            <p className="text-body">Finish authorizing in your browser. This window updates automatically once {providerName} confirms the connection.</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void openUrl(redirectUrl)}>
              <ExternalLink className="size-3.5" /> Open authorization page again
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="connection-label">Account label</Label>
            <Input id="connection-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. Client ${providerName}`} autoFocus />
          </div>
        )}
        <DialogFooter>
          {redirectUrl ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={initiate.isPending}>
                Cancel
              </Button>
              <Button onClick={start} loading={initiate.isPending}>
                Continue in browser
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
