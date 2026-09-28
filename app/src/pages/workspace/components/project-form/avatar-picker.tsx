import { Dices, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { randomAvatarSeed } from "@/lib/identicon";

interface AvatarPickerProps {
  name: string;
  color: string;
  value: string | null;
  onChange: (seed: string | null) => void;
}

/** Preview of the project avatar with a shuffle button (random identicon) and a reset back to initials. */
export function AvatarPicker({ name, color, value, onChange }: AvatarPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <ProjectAvatar name={name || "?"} color={color} seed={value} size="lg" />
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(randomAvatarSeed())}>
        <Dices className="size-3.5" /> {value ? "Shuffle" : "Random avatar"}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X className="size-3.5" /> Use initials
        </Button>
      )}
    </div>
  );
}
