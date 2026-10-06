import { useState } from "react";
import { ChevronsUpDown, FileKey2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEnvKeys } from "@/features/local-workspace/hooks/use-local-workspace";
import { useProjectEnvConsent } from "@/features/projects/hooks/use-projects";
import { cn } from "@/lib/utils";
import { EnvAccessConsentDialog } from "./env-access-consent-dialog";

const VALID_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface ServiceEnvKeyPickerProps {
  projectId: string;
  projectName: string;
  /** Service working directory, relative to the project root. */
  cwd: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Variable-name dropdown. Lists the names found in the service folder's `.env*` files (after the user agreed
 * for this project) and still accepts any typed name.
 */
export function ServiceEnvKeyPicker({
  projectId,
  projectName,
  cwd,
  value,
  onChange,
}: ServiceEnvKeyPickerProps) {
  const [open, setOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [search, setSearch] = useState("");
  const consent = useProjectEnvConsent(projectId);
  const allowed = consent.data?.accepted === true;
  const keys = useEnvKeys(projectId, cwd, open && allowed);

  const typed = search.trim();
  const needle = typed.toLowerCase();
  const matches = (keys.data ?? []).filter((k) =>
    k.key.toLowerCase().includes(needle),
  );
  const canUseTyped =
    VALID_NAME_RE.test(typed) && !(keys.data ?? []).some((k) => k.key === typed);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setSearch("");
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-label="Variable name"
              aria-expanded={open}
              className={cn(
                "h-8 w-full justify-between px-2.5 font-mono text-xs font-normal",
                !value && "text-muted-foreground",
              )}
            >
              <span className="truncate">{value || "VITE_API_URL"}</span>
              <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-72 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type a name"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {!allowed && !consent.isPending && (
                <CommandGroup>
                  <CommandItem
                    value="read-env"
                    onSelect={() => {
                      setOpen(false);
                      setConsentOpen(true);
                    }}
                  >
                    <FileKey2 /> Read names from .env files…
                  </CommandItem>
                </CommandGroup>
              )}
              {allowed && keys.isError && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {keys.error.message}
                </p>
              )}
              {allowed && keys.isPending && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  Reading .env files…
                </p>
              )}
              {allowed && keys.isSuccess && matches.length > 0 && (
                <CommandGroup heading="From .env files">
                  {matches.map((k) => (
                    <CommandItem
                      key={k.key}
                      value={k.key}
                      data-checked={k.key === value}
                      onSelect={() => choose(k.key)}
                    >
                      <span className="font-mono text-xs">{k.key}</span>
                      <span className="ml-auto truncate pr-5 text-[0.6875rem] text-muted-foreground">
                        {k.files.join(", ")}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {canUseTyped && (
                <CommandGroup heading={matches.length ? undefined : "Custom"}>
                  <CommandItem value="use-typed" onSelect={() => choose(typed)}>
                    <span className="font-mono text-xs">Use “{typed}”</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {allowed && keys.isSuccess && !matches.length && !canUseTyped && (
                <CommandEmpty>
                  {keys.data.length
                    ? "No matching variable."
                    : "No .env files found in this folder."}
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <EnvAccessConsentDialog
        projectId={projectId}
        projectName={projectName}
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onAccepted={() => setOpen(true)}
      />
    </>
  );
}
