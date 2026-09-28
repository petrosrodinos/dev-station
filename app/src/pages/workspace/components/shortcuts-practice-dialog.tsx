import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuspendShortcuts } from "@/features/users/hooks/use-shortcuts";
import { useDialogsStore } from "@/stores/dialogs";
import { ShortcutsPracticeChallenge } from "./shortcuts-practice-challenge";
import { ShortcutsPracticeFreePlay } from "./shortcuts-practice-free-play";

const PracticeTabs = {
  FREE_PLAY: "free-play",
  CHALLENGE: "challenge",
} as const;

/** Sandbox for trying shortcuts safely: real actions are paused while it is open. */
export function ShortcutsPracticeDialog() {
  const open = useDialogsStore((s) => s.shortcuts_practice);
  const setOpen = useDialogsStore((s) => s.setShortcutsPractice);
  useSuspendShortcuts(open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Practice shortcuts</DialogTitle>
          <DialogDescription>Nothing you press here runs for real. Press Esc to leave.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={PracticeTabs.FREE_PLAY}>
          <TabsList>
            <TabsTrigger value={PracticeTabs.FREE_PLAY}>Free play</TabsTrigger>
            <TabsTrigger value={PracticeTabs.CHALLENGE}>Challenge</TabsTrigger>
          </TabsList>
          <TabsContent value={PracticeTabs.FREE_PLAY} className="mt-4">
            <ShortcutsPracticeFreePlay />
          </TabsContent>
          <TabsContent value={PracticeTabs.CHALLENGE} className="mt-4">
            <ShortcutsPracticeChallenge />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
