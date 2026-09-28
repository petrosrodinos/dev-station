import { FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pickDirectory } from "@/features/local-workspace/services/local-workspace.services";

interface DirectoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onPicked?: (value: string) => void;
}

/** Absolute folder path with a native "Browse…" picker (Electron dialog). */
export function DirectoryField({ value, onChange, placeholder, onPicked }: DirectoryFieldProps) {
  const browse = async () => {
    const picked = await pickDirectory(value || undefined).catch(() => null);
    if (picked) {
      onChange(picked);
      onPicked?.(picked);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => value.trim() && onPicked?.(value.trim())}
        placeholder={placeholder}
        className="font-mono text-[0.7813rem]"
      />
      <Button type="button" variant="outline" onClick={browse} className="shrink-0 gap-1.5">
        <FolderOpen className="size-4" /> Browse…
      </Button>
    </div>
  );
}
