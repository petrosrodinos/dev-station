import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useGetClients } from "@/features/clients/hooks/use-clients";
import { cn } from "@/lib/utils";

interface ClientPickerProps {
  clientId?: string;
  clientName?: string;
  onChange: (value: { client_id?: string; client_name?: string }) => void;
}

/** Pick an existing client or type a new one (created with the project). Empty = internal project. */
export function ClientPicker({ clientId, clientName, onChange }: ClientPickerProps) {
  const { data: clients } = useGetClients();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = clients?.find((c) => c.id === clientId);
  const label = selected?.name ?? clientName ?? "Internal (no client)";
  const exactMatch = clients?.some((c) => c.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className={cn("truncate", !selected && !clientName && "text-muted-foreground")}>{label}</span>
          <ChevronsUpDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or create client…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No clients yet.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__internal"
                onSelect={() => {
                  onChange({ client_id: undefined, client_name: undefined });
                  setOpen(false);
                }}
              >
                <Check className={cn("size-3.5", !clientId && !clientName ? "opacity-100" : "opacity-0")} />
                Internal (no client)
              </CommandItem>
              {clients?.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange({ client_id: c.id, client_name: undefined });
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-3.5", c.id === clientId ? "opacity-100" : "opacity-0")} />
                  {c.name}
                </CommandItem>
              ))}
              {search.trim() && !exactMatch && (
                <CommandItem
                  value={`__create ${search}`}
                  onSelect={() => {
                    onChange({ client_id: undefined, client_name: search.trim() });
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Plus className="size-3.5" /> Create client “{search.trim()}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
